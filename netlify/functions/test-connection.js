// Netlify Function to test Venice.ai API connection
const fetch = require('node-fetch');

// Hard-coded API key for testing
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

    // Use the hard-coded API key instead of the one from the request
    const apiKey = VENICE_API_KEY;

    // Test the connection by making a simple request
    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "qwen-2.5-vl",
        messages: [
          {
            role: "user",
            content: "Test connection"
          }
        ],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Connection successful'
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