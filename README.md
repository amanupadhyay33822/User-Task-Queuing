# Objective
The task is to build a Node.js API cluster with rate limiting and a task queueing system to process tasks based on user IDs. Each user can submit 1 task per second and up to 20 tasks per minute. Any additional requests should be queued and processed according to these limits. The task completion should be logged to a file with the user ID and timestamp.

#Approch
 The solution follows a modular approach:

1-Cluster Setup:

The API is designed to run as a cluster with two worker processes to ensure better scalability and resilience.
The cluster module is used to fork multiple worker processes.
If any worker crashes, it will be automatically restarted by the master process.

2-Rate Limiting:

Instead of using Redis, we chose Node Cache (an in-memory caching solution) to track user request data for rate limiting.
We enforce two types of rate limits:
1 task per second per user.
20 tasks per minute per user.
Node Cache is used to store:
lastTaskTime: The timestamp of the last task the user submitted.
taskCount: The number of tasks submitted by the user in the last 60 seconds.
The cache uses TTL (Time-To-Live) functionality to automatically expire and reset counts after 60 seconds.

3-Task Queueing System:

Bull is used for queueing tasks. It provides a powerful and scalable job queue, backed by Redis.
Each user’s valid request is added to the queue, ensuring that the tasks are processed sequentially, even if multiple tasks are queued due to rate limiting.

4-Task Processing:

Tasks are processed by workers, and after processing, a log function logs the completion.
The task processing simulates a delay of 1 second per task, to match the rate-limiting criteria of 1 task per second.

5-Logging:

The provided task function logs the completion of each task with the user ID and timestamp.
This information is logged into a file using Winston. The log file is named task-log.txt and is stored in the same directory as the API.

6-Failure Handling and Edge Cases:

If a user exceeds the rate limits, the API returns a 429 (Too Many Requests) response.
Workers are automatically restarted by the master process in case of a crash, ensuring high availability and fault tolerance.
