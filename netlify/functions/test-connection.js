// Netlify Function to test Venice.ai API connection
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    const { apiKey } = requestBody;
    
    if (!apiKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'API key is required' })
      };
    }

    // Test the API connection by making a simple request to Venice.ai
    const veniceApiUrl = 'https://api.venice.ai/api/v1/models';
    
    const response = await fetch(veniceApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    // Parse the response
    const data = await response.json();

    // Check for errors
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          success: false,
          error: 'Error connecting to Venice.ai API', 
          details: data 
        })
      };
    }

    // Return success with available models
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true,
        message: 'Successfully connected to Venice.ai API',
        models: data.data || []
      })
    };
  } catch (error) {
    console.error('Error testing API connection:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false,
        error: 'Internal Server Error', 
        message: error.message 
      })
    };
  }
}; 