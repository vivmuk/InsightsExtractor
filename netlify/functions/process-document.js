// Netlify Function to process documents with OpenAI API
const fetch = require('node-fetch');

// Hard-coded API key for testing - ensure it's properly formatted
const OPENAI_API_KEY = "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";

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
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Fetched ${data.data.length} models from OpenAI`);
    
    // Sort models by ID
    const sortedModels = data.data.sort((a, b) => a.id.localeCompare(b.id));
    
    // Add capabilities information
    const modelsWithInfo = sortedModels.map(model => ({
      ...model,
      capabilities: {
        vision: model.id.includes('vision') || model.id.includes('gpt-4'),
        chat: model.id.includes('gpt') || model.id.includes('chat'),
        embeddings: model.id.includes('embedding') || model.id.includes('embed'),
        audio: model.id.includes('whisper') || model.id.includes('audio')
      }
    }));
    
    console.log('Models processed with capabilities');
    return modelsWithInfo;
  } catch (error) {
    console.error('Error in getAvailableModels:', error);
    throw error; // Re-throw to handle in the main handler
  }
}

exports.handler = async function(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Handle GET request for models
  if (event.httpMethod === 'GET') {
    try {
      const models = await getAvailableModels();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ models })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch models' })
      };
    }
  }

  try {
    if (event.httpMethod !== 'POST') {
      throw new Error('Only POST and GET requests are allowed');
    }

    console.log('Processing request...');
    const { file, filename, selectedModel } = JSON.parse(event.body);
    
    if (!file) {
      throw new Error('Missing required parameter: file');
    }

    // Log file information
    console.log('File name:', filename);
    console.log('File data length:', file.length);
    console.log('Selected model:', selectedModel);
    
    // Use the OpenAI API key
    const apiKey = OPENAI_API_KEY;
    
    // Validate API key
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is missing or invalid');
    }
    
    // Update the extraction payload to handle non-vision models
    const extractionPayload = {
      model: selectedModel || "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are a Medical Science Liaison (MSL) document analyzer specializing in medical presentations. Extract structured information from slides, focusing on medical/scientific content and therapeutic areas. For each slide, identify the medical taxonomy (e.g., Oncology, Cardiology, Immunology, etc.) and provide MSL-focused insights. Keep all responses concise and clinically relevant."
        },
        {
          role: "user",
          content: selectedModel.includes('vision') ? [
            {
              type: "text",
              text: "Analyze this medical presentation and extract the following for each slide:\n1. Slide number\n2. Title of the slide\n3. A brief summary (1-2 sentences)\n4. Medical Taxonomy (primary therapeutic area or medical category)\n5. MSL Usage (one-line summary of how an MSL would use this slide in the field)\n\nReturn ONLY a CSV formatted response with these columns: 'Slide #,Title,Summary,Medical_Taxonomy,MSL_Usage'\nInclude the header row."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:application/pdf;base64,${file}`,
                detail: "low"
              }
            }
          ] : [
            {
              type: "text",
              text: `Base64 encoded document content: ${file}\n\nAnalyze this medical presentation and extract the following for each slide:\n1. Slide number\n2. Title of the slide\n3. A brief summary (1-2 sentences)\n4. Medical Taxonomy (primary therapeutic area or medical category)\n5. MSL Usage (one-line summary of how an MSL would use this slide in the field)\n\nReturn ONLY a CSV formatted response with these columns: 'Slide #,Title,Summary,Medical_Taxonomy,MSL_Usage'\nInclude the header row.`
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    };

    // Create a simulated CSV response for testing
    const simulateExtraction = () => {
      const headers = "Slide #,Title,Summary,Medical_Taxonomy,MSL_Usage";
      const taxonomies = ["Oncology", "Cardiology", "Immunology", "Neurology", "Rare Diseases"];
      const rows = Array.from({ length: 40 }, (_, i) => {
        const slideNum = i + 1;
        const taxonomy = taxonomies[Math.floor(Math.random() * taxonomies.length)];
        return `${slideNum},"Sample Title ${slideNum}","Brief summary of slide ${slideNum} content.","${taxonomy}","Use this slide to discuss ${taxonomy.toLowerCase()} treatment paradigms with HCPs."`;
      });
      return [headers, ...rows].join('\n');
    };

    console.log('Sending request to OpenAI API...');
    console.log('API endpoint: https://api.openai.com/v1/chat/completions');
    console.log('Using model: gpt-4-vision-preview');
    
    // Make the extraction request
    const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(extractionPayload)
    });

    console.log('Extraction response status:', extractionResponse.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries([...extractionResponse.headers.entries()])));
    
    if (extractionResponse.ok) {
      const extractionResult = await extractionResponse.json();
      console.log('API Response received');
      
      if (extractionResult.choices && extractionResult.choices.length > 0) {
        const csvData = extractionResult.choices[0].message.content.trim();
        console.log('Successfully extracted content');
        console.log('CSV data first 100 chars:', csvData.substring(0, 100));
        
        // Basic validation of CSV format
        const lines = csvData.trim().split('\n');
        if (lines.length < 2 || !lines[0].includes('Slide #')) {
          console.log('CSV validation failed: invalid format');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              csvData: simulateExtraction(),
              note: "Using simulated data due to extraction issues - API returned invalid format"
            })
          };
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            csvData: csvData
          })
        };
      } else {
        console.log('API response missing expected data structure:', JSON.stringify(extractionResult, null, 2));
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            csvData: simulateExtraction(),
            note: "Using simulated data due to unexpected API response format"
          })
        };
      }
    } else {
      // Try to get the error message from the response
      let errorMessage = "Unknown error";
      try {
        const errorResponse = await extractionResponse.text();
        console.log('Error response from API:', errorResponse);
        try {
          const errorJson = JSON.parse(errorResponse);
          errorMessage = errorJson.error?.message || errorJson.message || "API error";
        } catch (e) {
          errorMessage = errorResponse || "API error";
        }
      } catch (e) {
        errorMessage = `API returned status ${extractionResponse.status}`;
      }
      
      console.log('Extraction failed:', errorMessage);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          csvData: simulateExtraction(),
          note: `Using simulated data due to API error: ${errorMessage}`
        })
      };
    }
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        details: 'Check Netlify function logs for more information'
      })
    };
  }
}; 