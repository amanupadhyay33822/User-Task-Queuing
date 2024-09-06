const cluster = require('cluster');
const os = require('os');
const express = require('express');
const NodeCache = require('node-cache');
const Queue = require('bull');
const fs = require('fs');
const winston = require('winston');
const path = require('path');
const numCPUs = 2; // Number of workers

// Master process to fork workers
if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

  

} else {
    const app = express();
    app.use(express.json())

    // In-memory cache setup for rate limiting
    const taskCache = new NodeCache();

    // Task Queue Setup
    const taskQueue = new Queue('task-queue', {
        redis: {
            host: '127.0.0.1',
            port: 6379
        }
    });

    // Logging Setup with Winston
    const logFilePath = path.join(__dirname, 'task-log.txt');
    const logger = winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [
            new winston.transports.File({ filename: logFilePath })
        ]
    });

    // Provided Task Function
    const logTaskCompletion = (userId) => {
        const timestamp = new Date().toISOString();
        const logData = {
            userId: userId,
            timestamp: timestamp,
            message: `Task completed for user ${userId} at ${timestamp}`
        };
        logger.info(logData); // Log to file
        console.log(logData.message); // Also log to console for debugging
    };

    // Process tasks from the queue
    taskQueue.process(async (job) => {
        const { userId } = job.data;
        // Simulate task processing
        await new Promise(resolve => setTimeout(resolve, 1000)); // Task takes 1 second
        logTaskCompletion(userId); // Log task completion with provided function
    });

    // API route to submit a task
    app.post('/task', async (req, res) => {
        const userId = req.body.userId;
        

        const currentTime = Date.now();

        // Check for second-based rate limiting
        const lastTaskTime = taskCache.get(`${userId}-lastTask`);
        const taskCount = taskCache.get(`${userId}-taskCount`) || 0;

        // Enforce 1 task per second
        if (lastTaskTime && currentTime - lastTaskTime < 1000) {
            return res.status(429).send({ message: 'Rate limit exceeded: 1 task per second' });
        }

        // Enforce 20 tasks per minute
        if (taskCount >= 20) {
            return res.status(429).send({ message: 'Rate limit exceeded: 20 tasks per minute' });
        }

        // Update cache with new task time and count
        taskCache.set(`${userId}-lastTask`, currentTime);
        taskCache.set(`${userId}-taskCount`, taskCount + 1, 60); // TTL of 60 seconds

        // Queue the task for processing
        await taskQueue.add({ userId });

        res.status(200).send({ message: `Task for user ${userId} queued successfully` });
    });

    // Reset task count every minute
    setInterval(() => {
        taskCache.keys().forEach(key => {
            if (key.endsWith('-taskCount')) {
                taskCache.set(key, 0);
            }
        });
    }, 60 * 1000);

    // Start the server
    app.listen(3000, () => {
        console.log(`Worker ${process.pid} started`);
    });
}
