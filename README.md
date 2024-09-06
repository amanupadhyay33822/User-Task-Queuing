# Objective
The task is to build a Node.js API cluster with rate limiting and a task queueing system to process tasks based on user IDs. Each user can submit 1 task per second and up to 20 tasks per minute. Any additional requests should be queued and processed according to these limits. The task completion should be logged to a file with the user ID and timestamp.
