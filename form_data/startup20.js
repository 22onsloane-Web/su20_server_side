const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class GoogleSheetsService {
  constructor() {
    // Updated to include write permissions
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.SERVICE_ACCOUNT_PATH || './form_data/service-account.json',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/spreadsheets'  // Added write permission
      ],
    });
    
    this.sheets = google.sheets({ 
      version: 'v4', 
      auth: auth
    });
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.clientDataPath = path.join(__dirname, '../client/public/startup-data.json');
    this.serverCachePath = path.join(__dirname, 'cached_data.json');
    
    console.log('GoogleSheetsService initialized with READ/WRITE permissions');
    console.log('Spreadsheet ID:', this.spreadsheetId);
  }

  async fetchAllData() {
    try {
      console.log('\n=== FETCHING ALL DATA ===');
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:AG',
      });

      const rows = response.data.values;
      console.log('Total rows (including header):', rows ? rows.length : 0);
      
      if (!rows || rows.length <= 1) {
        console.log('ERROR: No data rows found (only header or empty)');
        return [];
      }

      console.log('SUCCESS: Found', rows.length - 1, 'data rows');
      
      const headers = rows[0];
      console.log('Headers:', headers.slice(0, 5), '... (showing first 5)');

      // Convert to objects
      const data = rows.slice(1).map((row, index) => {
        const obj = {};
        headers.forEach((header, headerIndex) => {
          obj[header] = row[headerIndex] || '';
        });
        
        // Show first 2 rows
        if (index < 2) {
          console.log(`Row ${index + 1}:`, {
            id: obj['id'],
            'Startup Name': obj['Startup Name'],
            'Country': obj['Country'],
            'Category': obj['Category']
          });
        }
        
        return obj;
      });

      console.log('Converted', data.length, 'rows to JSON objects');
      
      // Save to files
      const cacheData = {
        data: data,
        lastUpdated: new Date().toISOString(),
        recordCount: data.length
      };
      
      // Save to server cache
      await fs.writeFile(this.serverCachePath, JSON.stringify(cacheData, null, 2));
      console.log('Saved to server cache:', this.serverCachePath);
      
      // Save to client public folder
      try {
        await fs.mkdir(path.dirname(this.clientDataPath), { recursive: true });
        await fs.writeFile(this.clientDataPath, JSON.stringify(cacheData, null, 2));
        console.log('Saved to client file:', this.clientDataPath);
      } catch (error) {
        console.log('Note: Could not save to client folder (client may not exist yet)');
        console.log('Client path attempted:', this.clientDataPath);
      }
      
      return data;
    } catch (error) {
      console.error('ERROR in fetchAllData:', error.message);
      throw error;
    }
  }

  async getData(forceRefresh = false) {
    if (forceRefresh) {
      return await this.fetchAllData();
    }

    // Try to load cached data first
    try {
      const cached = await fs.readFile(this.serverCachePath, 'utf8');
      const cacheData = JSON.parse(cached);
      if (cacheData.data && cacheData.data.length > 0) {
        console.log('Using cached data:', cacheData.data.length, 'records');
        return cacheData.data;
      }
    } catch (error) {
      console.log('No valid cache found, fetching fresh data');
    }

    return await this.fetchAllData();
  }

  async updateCachedData(updatedData) {
    try {
      console.log('\n=== UPDATING CACHED DATA ===');
      console.log('Updating cache with', updatedData.length, 'records');
      
      const cacheData = {
        data: updatedData,
        lastUpdated: new Date().toISOString(),
        recordCount: updatedData.length
      };
      
      // Save to server cache
      await fs.writeFile(this.serverCachePath, JSON.stringify(cacheData, null, 2));
      console.log('Updated server cache:', this.serverCachePath);
      
      // Save to client public folder
      try {
        await fs.mkdir(path.dirname(this.clientDataPath), { recursive: true });
        await fs.writeFile(this.clientDataPath, JSON.stringify(cacheData, null, 2));
        console.log('Updated client file:', this.clientDataPath);
      } catch (error) {
        console.log('Note: Could not update client folder (client may not exist)');
      }
      
      console.log('Cache update completed successfully');
      return true;
    } catch (error) {
      console.error('ERROR in updateCachedData:', error.message);
      throw error;
    }
  }

  async updateStatusInGoogleSheets(recordId, newStatus) {
    try {
      console.log(`\n=== UPDATING GOOGLE SHEETS ===`);
      console.log(`Updating record ID ${recordId} to status: ${newStatus}`);
      
      // First, get all data to find the row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:AG',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        throw new Error('No data found in Google Sheets');
      }

      const headers = rows[0];
      const statusColumnIndex = headers.findIndex(header => header === 'Status');
      const idColumnIndex = headers.findIndex(header => header === 'id');
      
      console.log('Headers found:', headers.length);
      console.log('Status column index:', statusColumnIndex);
      console.log('ID column index:', idColumnIndex);
      
      if (statusColumnIndex === -1) {
        throw new Error('Status column not found in Google Sheets');
      }
      
      if (idColumnIndex === -1) {
        throw new Error('ID column not found in Google Sheets');
      }

      // Find the row with matching ID
      let targetRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColumnIndex] == recordId) {
          targetRowIndex = i + 1; // +1 because Google Sheets is 1-indexed
          console.log(`Found record at row ${targetRowIndex}`);
          break;
        }
      }

      if (targetRowIndex === -1) {
        throw new Error(`Record with ID ${recordId} not found in Google Sheets`);
      }

      // Convert column index to letter (A, B, C, etc.)
      const columnLetter = this.numberToColumnLetter(statusColumnIndex + 1);
      const range = `Sheet1!${columnLetter}${targetRowIndex}`;
      
      console.log(`Updating range: ${range} with value: ${newStatus}`);

      // Update the status in Google Sheets
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[newStatus]]
        }
      });

      console.log(`Successfully updated Google Sheets: ${range} = ${newStatus}`);
      return true;
    } catch (error) {
      console.error('Error updating Google Sheets:', error.message);
      throw error;
    }
  }

  async updateMultipleStatusesInGoogleSheets(updates) {
    try {
      console.log(`\n=== BULK UPDATING GOOGLE SHEETS ===`);
      console.log(`Processing ${updates.length} status updates`);
      
      // Get all data to find the rows
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:AG',
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) {
        throw new Error('No data found in Google Sheets');
      }

      const headers = rows[0];
      const statusColumnIndex = headers.findIndex(header => header === 'Status');
      const idColumnIndex = headers.findIndex(header => header === 'id');
      
      if (statusColumnIndex === -1) {
        throw new Error('Status column not found in Google Sheets');
      }
      
      if (idColumnIndex === -1) {
        throw new Error('ID column not found in Google Sheets');
      }

      // Prepare batch update data
      const batchData = [];
      const successfulUpdates = [];
      const failedUpdates = [];

      // Find all rows that need updating
      for (const update of updates) {
        let targetRowIndex = -1;
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][idColumnIndex] == update.id) {
            targetRowIndex = i + 1; // +1 because Google Sheets is 1-indexed
            break;
          }
        }

        if (targetRowIndex !== -1) {
          const columnLetter = this.numberToColumnLetter(statusColumnIndex + 1);
          const range = `Sheet1!${columnLetter}${targetRowIndex}`;
          
          batchData.push({
            range: range,
            values: [[update.newStatus]]
          });
          
          successfulUpdates.push({
            id: update.id,
            range: range,
            status: update.newStatus
          });
          
          console.log(`Prepared update: ${range} = ${update.newStatus}`);
        } else {
          failedUpdates.push({
            id: update.id,
            error: 'Record not found in Google Sheets'
          });
          console.log(`Record ID ${update.id} not found in Google Sheets`);
        }
      }

      if (batchData.length === 0) {
        throw new Error('No valid records found for updating');
      }

      // Execute batch update
      console.log(`Executing batch update for ${batchData.length} records...`);
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: batchData
        }
      });

      console.log(`Batch update completed successfully: ${successfulUpdates.length} records updated`);
      
      return {
        successful: successfulUpdates,
        failed: failedUpdates,
        totalUpdated: successfulUpdates.length
      };

    } catch (error) {
      console.error('Error in bulk update:', error.message);
      throw error;
    }
  }

  // Helper method to convert column number to letter
  numberToColumnLetter(columnNumber) {
    let columnName = '';
    while (columnNumber > 0) {
      const modulo = (columnNumber - 1) % 26;
      columnName = String.fromCharCode(65 + modulo) + columnName;
      columnNumber = Math.floor((columnNumber - modulo) / 26);
    }
    return columnName;
  }
}

const sheetsService = new GoogleSheetsService();

module.exports = {
  getCompetitionData: async (forceRefresh = false) => {
    try {
      return await sheetsService.getData(forceRefresh);
    } catch (error) {
      console.error('Error in getCompetitionData:', error.message);
      return [];
    }
  },

  getFilteredData: async (column, value) => {
    try {
      const data = await sheetsService.getData();
      return data.filter(row => 
        row[column] && 
        row[column].toString().toLowerCase().includes(value.toLowerCase())
      );
    } catch (error) {
      console.error('Error in getFilteredData:', error.message);
      return [];
    }
  },

  refreshData: async () => {
    try {
      return await sheetsService.getData(true);
    } catch (error) {
      console.error('Error in refreshData:', error.message);
      return [];
    }
  },

  testConnection: async () => {
    try {
      console.log('\n=== TESTING CONNECTION BY FETCHING ALL DATA ===');
      const data = await sheetsService.fetchAllData();
      console.log('Connection test successful! Found', data.length, 'records');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  },

  updateCachedData: async (updatedData) => {
    try {
      return await sheetsService.updateCachedData(updatedData);
    } catch (error) {
      console.error('Error in updateCachedData:', error.message);
      throw error;
    }
  },

  updateStatusInGoogleSheets: async (recordId, newStatus) => {
    try {
      return await sheetsService.updateStatusInGoogleSheets(recordId, newStatus);
    } catch (error) {
      console.error('Error in updateStatusInGoogleSheets:', error.message);
      throw error;
    }
  },

  updateMultipleStatusesInGoogleSheets: async (updates) => {
    try {
      return await sheetsService.updateMultipleStatusesInGoogleSheets(updates);
    } catch (error) {
      console.error('Error in updateMultipleStatusesInGoogleSheets:', error.message);
      throw error;
    }
  }
};
