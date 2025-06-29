const express = require('express');
const axios = require('axios');
const cors = require('cors');
const redis = require('redis');

const redisClient = redis.createClient();

redisClient.on('error', (err)=> console.error('Redis client error  :', err))

async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect();
        console.log('Connected to redis');
        
    }
}
connectRedis();

const DEFAULT_EXPIRATION = 3600

const app = express();
app.use(cors());

app.get('/photos', async (req, res) =>{
    const albumId = req.query.albumId;
    const cacheKey = `photos?albumid=${albumId}` 

    try {
       const data = await getOrSetCache(cacheKey, async () =>{
        const response = await axios.get(
            'https://jsonplaceholder.typicode.com/photos', 
            { params: { albumId },
      });
      return response.data;
    });

    res.json(data);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/photos/:id', async(req, res)=>{
    const photoId  = req.params.id;
    const cacheKey = `photos?albumid=${photoId}`
    
    try {
        const data = await getOrSetCache(cacheKey, async() => {
            const response = await axios.get(`https://jsonplaceholder.typicode.com/photos/${photoId}`);
            return response.data;
        });
        res.json(data);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
})



async function getOrSetCache(key, fetchData) {
  try {
    const cachedData = await redisClient.get(key);
    if (cachedData != null) {
      console.log('Cache Hit');
      return JSON.parse(cachedData);
    }

    console.log('Cache Miss ');
    const freshData = await fetchData();
    await redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
    return freshData;
  } catch (error) {
    console.error('Cache error:', error);
    // In case of Redis error, fallback to fetching fresh data
    return await fetchData();
  }
}

app.listen(5000, () => {
    console.log('Server running on http://localhost:4000');
});
