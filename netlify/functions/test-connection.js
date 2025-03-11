// Netlify Function to test OpenAI API connection
const fetch = require('node-fetch');

// Hard-coded API key for testing - ensure it's properly formatted
const OPENAI_API_KEY = "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";

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

    console.log('Testing connection to OpenAI API...');
    
    // Use the OpenAI API key
    const apiKey = OPENAI_API_KEY;
    
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is missing or invalid');
    }
    
    console.log('API key length:', apiKey.length);
    console.log('Using model: gpt-4o-mini-2024-07-18');

    // Test the connection by making a simple request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Test connection"
              }
            ]
          }
        ],
        max_tokens: 20
      })
    });

    console.log('Test connection response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(`API request failed (${response.status}): ${errorJson.error?.message || errorJson.message || errorText}`);
      } catch (e) {
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }
    }
    
    const responseData = await response.json();
    console.log('Connection test successful');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Connection successful',
        model: 'gpt-4o-mini-2024-07-18'
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