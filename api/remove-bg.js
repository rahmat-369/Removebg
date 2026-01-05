const https = require('https');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method tidak diizinkan' });
  }

  try {
    const { image_url, image_base64, size } = req.body;

    if (!image_url && !image_base64) {
      return res.status(400).json({ 
        error: 'Harap kirim image_url atau image_base64' 
      });
    }

    const formData = new FormData();
    formData.append('size', size || 'auto');

    if (image_url) {
      formData.append('image_url', image_url);
    } else if (image_base64) {
      formData.append('image_file_b64', image_base64);
    }

    const options = {
      hostname: 'api.remove.bg',
      path: '/v1.0/removebg',
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        'X-Api-Key': process.env.REMOVEBG_API_KEY,
      },
    };

    const apiRequest = https.request(options, (apiResponse) => {
      const chunks = [];

      apiResponse.on('data', (chunk) => chunks.push(chunk));

      apiResponse.on('end', () => {
        if (apiResponse.statusCode === 200) {
          const buffer = Buffer.concat(chunks);
          const base64Image = buffer.toString('base64');
          
          res.status(200).json({
            success: true,
            image_base64: base64Image,
            contentType: apiResponse.headers['content-type']
          });
        } else {
          const errorBody = Buffer.concat(chunks).toString();
          res.status(apiResponse.statusCode).json({
            error: 'Gagal memproses gambar',
            details: errorBody
          });
        }
      });
    });

    apiRequest.on('error', (error) => {
      res.status(500).json({ 
        error: 'Terjadi kesalahan server', 
        details: error.message 
      });
    });

    formData.pipe(apiRequest);

  } catch (error) {
    res.status(500).json({ 
      error: 'Terjadi kesalahan', 
      details: error.message 
    });
  }
};
