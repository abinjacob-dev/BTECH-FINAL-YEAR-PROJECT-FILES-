require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// MongoDB connection constants
const MONGO_URI = 'mongodb://localhost:27017'; // Ensure this is correct
const DB_NAME = 'pzemdata23'; // Ensure this is a valid database name
const COLLECTION_NAME = 'pzemdatas1';

// Define the PZEM schema
const pzemSchema = new mongoose.Schema({
  voltage: Number,
  current: Number,
  power: Number,
  energy: Number,
  frequency: Number,
  pf: Number,
  date: String,
  time: String,
  timestamp: { type: Date, default: Date.now }
});

// Create the model
const PzemData = mongoose.model(COLLECTION_NAME, pzemSchema);

// Function to generate random data
const generateRandomData = (energy) => {
  const voltage = (Math.random() * (245 - 225) + 225).toFixed(1); // Random voltage between 225 and 245
  const pf = (Math.random() * (0.1) + 0.8).toFixed(2); // Random power factor between 0.8 and 0.9
  const current = (Math.random() * (1 - 0.01) + 0.01).toFixed(3); // Random current between 0.01 and 1
  const power = (voltage * current * pf).toFixed(2); // Calculate power based on voltage, current, and power factor
  const frequency = (Math.random() * (0.1) + 49.8).toFixed(1); // Random frequency between 49.8 and 49.9

  // Format energy to 3 decimal places
  const formattedEnergy = parseFloat(energy).toFixed(3);

  const data = {
    voltage: parseFloat(voltage),
    current: parseFloat(current),
    power: parseFloat(power),
    energy: parseFloat(formattedEnergy), // Ensure energy is formatted to 3 decimal places
    frequency: parseFloat(frequency),
    pf: parseFloat(pf),
  };
  console.log('Generated random data:', data);
  return data;
};

// Function to format time in 12-hour format
const formatTime = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strTime = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} ${ampm}`;
  return strTime;
};

// Function to generate data for the last 2 months
const generateDataForTwoMonths = async (energyType) => {
  const today = new Date();
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(today.getMonth() - 2);

  const dataToInsert = [];
  let initialEnergy;

  // Randomize the starting energy value based on user choice
  if (energyType === 1) { // Normal energy values
    initialEnergy = (Math.random() * (1 - 0.5) + 0.5).toFixed(3); // Random value between 0.5 and 1.0
  } else { // Greater energy values
    initialEnergy = (Math.random() * (250 - 150) + 150).toFixed(3); // Random value between 150 and 250
  }

  console.log(`Generating data from ${twoMonthsAgo.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}`);

  for (let d = twoMonthsAgo; d <= today; d.setDate(d.getDate() + 1)) {
    const dateString = d.toISOString().split('T')[0]; // Format YYYY-MM-DD
    const timeString = formatTime(new Date(d)); // Get formatted time

    const randomData = generateRandomData(parseFloat(initialEnergy)); // Ensure initialEnergy is a number
    const record = { ...randomData, date: dateString, time: timeString, timestamp: new Date() };
    dataToInsert.push(record);
    
    // Increase energy for the next day
    initialEnergy = (parseFloat(initialEnergy) + (energyType === 1 ? 0.003 : 0.5)).toFixed(3); // Adjust increment based on energy type
    console.log(`Prepared record for insertion:`, record);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(`${MONGO_URI}/${DB_NAME}`);
    console.log('Connected to MongoDB');

    const collections = await mongoose.connection.db.listCollections({ name: COLLECTION_NAME }).toArray();
    if (collections.length === 0) {
      console.log(`Collection ${COLLECTION_NAME} does not exist. It will be created upon insertion.`);
    }

    const action = await askUserAction();

    if (action === 1) { // Insert action
      console.log(`Inserting ${dataToInsert.length} records into ${COLLECTION_NAME}...`);
      const insertedRecords = await PzemData.insertMany(dataToInsert);
      console.log(`Successfully inserted ${insertedRecords.length} records into ${COLLECTION_NAME}`);
    } else if (action === 2) { // Delete action
      const recordsToDelete = await PzemData.find({}); // Find all records to delete
      if (recordsToDelete.length > 0) {
        const idsToDelete = recordsToDelete.map(record => record._id); // Get the IDs of the records
        const result = await PzemData.deleteMany({ _id: { $in: idsToDelete } }); // Delete only the inserted records
        console.log(`Successfully deleted ${result.deletedCount} records from ${COLLECTION_NAME}`);
      } else {
        console.log('No records found to delete.');
      }
    } else {
      console.log('Invalid action. Please choose 1 for insert or 2 for delete.');
    }
  } catch (error) {
    console.error('Error connecting to MongoDB or performing action:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Function to ask user for action
const askUserAction = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Do you want to insert or delete records? (1 for insert, 2 for delete): ', (answer) => {
      rl.close();
      resolve(parseInt(answer)); // Convert answer to an integer
    });
  });
};

// Function to ask user for energy type
const askEnergyType = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Do you want to generate normal energy values (1) or greater energy values (2)? ', (answer) => {
      rl.close();
      resolve(parseInt(answer)); // Convert answer to an integer
    });
  });
};

// Run the data generation
const runDataGeneration = async () => {
  const energyType = await askEnergyType();
  await generateDataForTwoMonths(energyType);
};

runDataGeneration();
