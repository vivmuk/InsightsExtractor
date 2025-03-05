// Netlify Function to test Venice.ai API connection
const fetch = require('node-fetch');

// Hard-coded API key for testing - ensure it's properly formatted
const VENICE_API_KEY = "n9jfLskZuDX9ecMPH2H6SfKLgCtHlIS6zjo4XAGY6l";

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    if (event.httpMethod !== 'POST') {
      throw new Error('Only POST requests are allowed');
    }

    console.log('Testing connection to Venice.ai API...');
    
    // Use the hard-coded API key
    const apiKey = VENICE_API_KEY;
    
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is missing or invalid');
    }
    
    console.log('API key length:', apiKey.length);
    console.log('Using model: llama-3.3-70b');

    // Test the connection by making a simple request to get model info
    const response = await fetch('https://api.venice.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Test connection response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('Connection test successful, got model list');

    // Check if llama-3.3-70b is available
    const llamaModel = responseData.models?.find(m => m.id === 'llama-3.3-70b');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Connection successful',
        model: 'llama-3.3-70b',
        modelAvailable: !!llamaModel
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message
      })
    };
  }
}; 