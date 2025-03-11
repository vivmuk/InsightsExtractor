// Netlify Function to process documents with OpenAI API
const fetch = require('node-fetch');

// Hard-coded API key for testing - ensure it's properly formatted
const OPENAI_API_KEY = "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";

// Function to test OpenAI connection
async function testOpenAIConnection() {
  try {
    console.log('Testing OpenAI connection...');
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI connection successful');
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    throw error;
  }
}

// Function to fetch available models from OpenAI
async function getAvailableModels() {
  try {
    console.log('Fetching models from OpenAI...');
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`Failed to fetch models: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`Fetched ${data.data.length} models from OpenAI`);
    
    // Filter and sort models
    const sortedModels = data.data
      .filter(model => 
        model.id.includes('gpt-4') || 
        model.id.includes('gpt-3.5') || 
        model.id.includes('vision')
      )
      .sort((a, b) => a.id.localeCompare(b.id));
    
    console.log(`Filtered to ${sortedModels.length} relevant models`);
    return sortedModels;
  } catch (error) {
    console.error('Error in getAvailableModels:', error);
    throw error;
  }
}

exports.handler = async function(event, context) {
  console.log('Received request:', event.httpMethod, event.path);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    console.log('Handling OPTIONS request');
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Handle GET request for models
    if (event.httpMethod === 'GET') {
      console.log('Testing connection and fetching models...');
      
      // First test the connection
      await testOpenAIConnection();
      
      // If connection test passes, fetch models
      const models = await getAvailableModels();
      console.log('Successfully fetched models');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          models,
          message: 'Connection successful and models retrieved'
        })
      };
    }

    // Handle POST request for document processing
    if (event.httpMethod === 'POST') {
      const { file, filename, selectedModel } = JSON.parse(event.body);
      
      if (!file) {
        throw new Error('Missing required parameter: file');
      }

      console.log('Processing document:', filename);
      console.log('Selected model:', selectedModel);

      const model = selectedModel || "gpt-4-vision-preview";
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: "system",
              content: "You are a Medical Science Liaison (MSL) document analyzer specializing in medical presentations. Extract structured information from slides, focusing on medical/scientific content and therapeutic areas. For each slide, identify the medical taxonomy (e.g., Oncology, Cardiology, Immunology, etc.) and provide MSL-focused insights. Keep all responses concise and clinically relevant."
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this medical presentation and extract the following for each slide:\n1. Slide number\n2. Title of the slide\n3. A brief summary (1-2 sentences)\n4. Medical Taxonomy (primary therapeutic area or medical category)\n5. MSL Usage (one-line summary of how an MSL would use this slide in the field)\n\nReturn ONLY a CSV formatted response with these columns: 'Slide #,Title,Summary,Medical_Taxonomy,MSL_Usage'"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${file}`,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API Error:', errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const csvData = result.choices[0].message.content.trim();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ csvData })
      };
    }

    throw new Error('Invalid HTTP method');
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        details: 'Check Netlify function logs for more information'
      })
    };
  }
}; 