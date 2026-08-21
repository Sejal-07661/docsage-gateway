const { Queue } = require("bullmq");
const connection = require("../config/redis");

const documentQueue = new Queue("document-processing", { connection });

module.exports = documentQueue;