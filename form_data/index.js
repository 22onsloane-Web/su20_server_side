const express = require('express');
const { 
  getCompetitionData, 
  getFilteredData, 
  refreshData, 
  updateCachedData, 
  updateStatusInGoogleSheets, 
  updateMultipleStatusesInGoogleSheets 
} = require('./startup20');

const router = express.Router();

// Main API endpoint - serves cached data
router.get('/', async (req, res) => {
  try {
    console.log('API Request: GET /api/competition-data');
    const startTime = Date.now();
    
    const data = await getCompetitionData();
    const responseTime = Date.now() - startTime;
    
    console.log(`Sending ${data.length} records (${responseTime}ms)`);
    
    res.json({ 
      success: true, 
      count: data.length, 
      data: data,
      source: 'cached',
      responseTime: `${responseTime}ms`,
      message: data.length > 0 ? `${data.length} startup records loaded` : 'No data available'
    });
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      count: 0,
      data: []
    });
  }
});

// Force refresh endpoint - fetches fresh data from Google Sheets
router.post('/refresh', async (req, res) => {
  try {
    console.log('API Request: POST /api/competition-data/refresh');
    console.log('Forcing refresh from Google Sheets...');
    const startTime = Date.now();
    
    const data = await refreshData();
    const refreshTime = Date.now() - startTime;
    
    console.log(`Refresh completed: ${data.length} records (${refreshTime}ms)`);
    
    res.json({ 
      success: true, 
      count: data.length, 
      data: data,
      source: 'fresh_from_sheets',
      refreshTime: `${refreshTime}ms`,
      message: `Successfully refreshed ${data.length} records from Google Sheets`
    });
  } catch (error) {
    console.error('Refresh Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      count: 0,
      data: []
    });
  }
});

// Update status endpoint - for approving/rejecting applications
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log(`\n=== STATUS UPDATE REQUEST ===`);
    console.log(`API Request: PUT /api/competition-data/${id}/status`);
    console.log(`Requested status: ${status}`);
    
    // Validate status value
    const validStatuses = ['Pending', 'Under Review', 'Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      console.log(`Invalid status: ${status}`);
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Get current data
    const data = await getCompetitionData();
    
    // Find the record to update
    const recordIndex = data.findIndex(item => item.id == id);
    if (recordIndex === -1) {
      console.log(`Record not found: ID ${id}`);
      return res.status(404).json({
        success: false,
        error: `Record with ID ${id} not found`
      });
    }
    
    const oldStatus = data[recordIndex].Status;
    console.log(`Current status: ${oldStatus} -> New status: ${status}`);
    
    // Update the status in the data
    data[recordIndex].Status = status;
    data[recordIndex]['Last Updated'] = new Date().toISOString();
    
    let googleSheetsUpdated = false;
    let cacheUpdated = false;
    let errors = [];

    try {
      // Step 1: Update Google Sheets directly
      console.log(`\nStep 1: Updating Google Sheets...`);
      await updateStatusInGoogleSheets(id, status);
      googleSheetsUpdated = true;
      console.log(`Google Sheets updated successfully`);
      
    } catch (sheetsError) {
      console.error(`Google Sheets update failed:`, sheetsError.message);
      errors.push(`Google Sheets update failed: ${sheetsError.message}`);
    }

    try {
      // Step 2: Update cached data (always do this as backup)
      console.log(`\nStep 2: Updating cache...`);
      await updateCachedData(data);
      cacheUpdated = true;
      console.log(`Cache updated successfully`);
      
    } catch (cacheError) {
      console.error(`Cache update failed:`, cacheError.message);
      errors.push(`Cache update failed: ${cacheError.message}`);
    }

    // Determine response based on what succeeded
    const responseData = {
      id: id,
      oldStatus: oldStatus,
      newStatus: status,
      updatedRecord: data[recordIndex],
      timestamp: new Date().toISOString(),
      googleSheetsUpdated: googleSheetsUpdated,
      cacheUpdated: cacheUpdated
    };

    if (googleSheetsUpdated || cacheUpdated) {
      console.log(`Status update completed for ID ${id}: ${oldStatus} -> ${status}`);
      
      let message = `Application ${status.toLowerCase()} successfully`;
      if (googleSheetsUpdated && cacheUpdated) {
        message += ' (updated in Google Sheets and cache)';
      } else if (googleSheetsUpdated) {
        message += ' (updated in Google Sheets only)';
      } else if (cacheUpdated) {
        message += ' (updated in cache only - Google Sheets may be unavailable)';
      }
      
      res.json({
        success: true,
        message: message,
        ...responseData,
        warnings: errors.length > 0 ? errors : undefined
      });
      
    } else {
      console.log(`Status update failed completely for ID ${id}`);
      res.status(500).json({
        success: false,
        error: 'Failed to update status in both Google Sheets and cache',
        ...responseData,
        errors: errors
      });
    }
    
  } catch (error) {
    console.error('Unexpected Status Update Error:', error.message);
    res.status(500).json({
      success: false,
      error: `Unexpected error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize all empty/null statuses to "Pending"
router.post('/initialize-pending', async (req, res) => {
  try {
    console.log(`\n=== INITIALIZE PENDING STATUS REQUEST ===`);
    console.log('API Request: POST /api/competition-data/initialize-pending');
    
    // Get current data
    const data = await getCompetitionData();
    console.log(`Total records: ${data.length}`);
    
    // Find records with empty/null status
    let updatedCount = 0;
    const recordsToUpdate = [];
    
    const updatedData = data.map(item => {
      // Check if status is empty, null, undefined, or whitespace
      if (!item.Status || item.Status.toString().trim() === '') {
        console.log(`Found record needing update - ID ${item.id}: "${item.Status}" -> "Pending"`);
        updatedCount++;
        recordsToUpdate.push({
          id: item.id,
          name: item['Startup Name'] || 'Unknown',
          oldStatus: item.Status || 'empty',
          newStatus: 'Pending'
        });
        
        return {
          ...item,
          Status: 'Pending',
          'Last Updated': new Date().toISOString()
        };
      }
      return item;
    });

    if (updatedCount === 0) {
      console.log('No records need status initialization');
      return res.json({
        success: true,
        message: 'All records already have status values',
        updatedCount: 0,
        updatedRecords: []
      });
    }

    console.log(`Found ${updatedCount} records needing status initialization`);
    
    let googleSheetsResult = null;
    let errors = [];

    // Update Google Sheets using bulk update
    try {
      console.log('Updating Google Sheets...');
      googleSheetsResult = await updateMultipleStatusesInGoogleSheets(recordsToUpdate);
      console.log(`Google Sheets bulk update completed: ${googleSheetsResult.totalUpdated}/${updatedCount} successful`);
    } catch (error) {
      console.error('Google Sheets bulk update failed:', error.message);
      errors.push(`Google Sheets update failed: ${error.message}`);
    }

    // Update cache regardless of Google Sheets results
    try {
      console.log('Updating cache...');
      await updateCachedData(updatedData);
      console.log('Cache updated successfully');
    } catch (error) {
      console.error('Cache update failed:', error.message);
      errors.push(`Cache update failed: ${error.message}`);
    }

    // Prepare response
    const responseData = {
      success: true,
      message: `Successfully initialized ${googleSheetsResult ? googleSheetsResult.totalUpdated : 0} records to "Pending" status`,
      updatedCount: updatedCount,
      successfulGoogleSheetsUpdates: googleSheetsResult ? googleSheetsResult.totalUpdated : 0,
      updatedRecords: recordsToUpdate,
      timestamp: new Date().toISOString()
    };

    if (googleSheetsResult && googleSheetsResult.failed && googleSheetsResult.failed.length > 0) {
      errors.push(...googleSheetsResult.failed.map(f => `ID ${f.id}: ${f.error}`));
    }

    if (errors.length > 0) {
      responseData.warnings = errors;
      responseData.message += ` (with ${errors.length} warnings)`;
    }

    console.log(`Initialization completed: ${responseData.successfulGoogleSheetsUpdates}/${updatedCount} records updated successfully`);
    res.json(responseData);
    
  } catch (error) {
    console.error('Initialize Pending Status Error:', error.message);
    res.status(500).json({
      success: false,
      error: `Failed to initialize pending status: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Filter endpoint
router.get('/filter', async (req, res) => {
  try {
    const { column, value } = req.query;
    console.log(`Filter request: ${column} = ${value}`);
    
    if (!column || !value) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: column and value' 
      });
    }
    
    const data = await getFilteredData(column, value);
    
    res.json({ 
      success: true, 
      count: data.length, 
      data: data,
      filter: { column, value }
    });
  } catch (error) {
    console.error('Filter Error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;