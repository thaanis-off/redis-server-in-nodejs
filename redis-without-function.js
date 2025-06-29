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

    try {
        const photosInRedis = await redisClient.get(`photos?albumid=${albumId}`)

        if (photosInRedis != null) {
            console.log('Cach Hit');
            return res.json(JSON.parse(photosInRedis))
        }
        // if not set photos in redis we have to set
        console.log('Cach Miss'); // to test this, enter flushall in redis-cli 
        const { data } = await axios.get(
            'https://jsonplaceholder.typicode.com/photos',
            { params: { albumId } }
        );
        // set photos in redis if not set first time
        await redisClient.setEx(`photos?albumid=${albumId}`, DEFAULT_EXPIRATION, JSON.stringify(data));

        res.json(data);

    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/photos/:id', async(req, res)=>{

    try {
        const photoInRedis = await redisClient.get(`photos:${req.params.id}`)
       
        
        if (photoInRedis != null) {
            console.log('Cach Hit');
            return res.json(JSON.parse(photoInRedis))
        }
        // if not set photos in redis we have to set
        console.log('Cach Miss'); // to test this, enter flushall in redis-cli 
        const { data } = await axios.get(
            `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
        )
        // set photos in redis if not set first time
        await redisClient.setEx(`photos:${req.params.id}`, DEFAULT_EXPIRATION, JSON.stringify(data));

        res.json(data);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.listen(4000, () => {
    console.log('Server running on http://localhost:4000');
});
