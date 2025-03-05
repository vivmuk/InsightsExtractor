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

    // Test the connection by making a simple request
    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama-3.3-70b",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant."
          },
          {
            role: "user",
            content: "Test connection"
          }
        ],
        venice_parameters: {
          enable_web_search: "off"
        }
      })
    });

    console.log('Test connection response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log('Connection test successful, model responded');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Connection successful',
        model: 'llama-3.3-70b'
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