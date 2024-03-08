const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL;
console.log(`HTTP rollup_server url is ${rollupServer}`);
import { create } from "ipfs-http-client";
//import axios from "axios";

const apiUrl = process.env.IPFS_API || "http://127.0.0.1:5001";
const ipfs = create({ url: apiUrl });
let counter = 1;
let primesList = [];
const statePath = "/state";
const outputPath = "/state/output";
const getPrimes = (lower, higher) => {
  let primes = [];
  console.log(lower, higher);

  for (let i = lower; i <= higher; i++) {
    var flag = 0;
    // looping through 2 to ith for the primality test
    for (let j = 2; j < i; j++) {
      if (i % j == 0) {
        flag = 1;
        break;
      }
    }
    if (flag == 0 && i != 1) {
      console.log(i);
      primes.push(i);
    }
  }
  return primes;
};

// Function to perform GET request
const getTx = async () => {
  try {
    const response = await fetch(`${rollupServer}/get_tx`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.json(); // or .json() if you expect JSON response
    console.log(`Got tx ${content}`);

    return content; // This might be useful if you want to do something with the response
  } catch (error) {
    console.error(`Error fetching data: ${error.message}`);
  }
};

// Function to perform GET request
const getData = async (namespace, hash) => {
  try {
    const response = await fetch(
      `${rollupServer}/get_data/${namespace}/${hash}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.arrayBuffer(); // or .json() if you expect JSON response

    return content; // This might be useful if you want to do something with the response
  } catch (error) {
    console.error(`Error fetching data: ${error.message}`);
  }
};

const hint = async (str) => {
  try {
    const response = await fetch(`${rollupServer}/hint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: new TextEncoder().encode(str), // Encode the string as UTF-8
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.text();
    console.log("Success:", responseData);
  } catch (error) {
    console.error("Error:", error);
  }
};

// Function to perform POST request
const finishTx = async () => {
  try {
    const response = await fetch(`${rollupServer}/finish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), // Empty JSON object as per original script
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log(`Finish tx request sent.`);
  } catch (error) {
    console.error(`Error finishing tx: ${error.message}`);
  }
};

const existFileIpfs = async (path) => {
  try {
    await ipfs.files.stat(path);
    return true;
  } catch (error) {
    if (error.message.includes("file does not exist")) return false;
    throw error;
  }
};

const readFileIpfs = async (path) => {
  try {
    const chunks = [];
    for await (const chunk of ipfs.files.read(path)) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks).toString();
    return data;
  } catch (error) {
    if (error.message.includes("file does not exist")) return "";
    throw error;
  }
};

const writeFileIpfs = async (path, data) => {
  const exist = await existFileIpfs(path);
  if (exist) await ipfs.files.rm(path); // Remove file if exists (if new data is less than old data, the old data will remain in the file)
  await ipfs.files.write(path, data, { create: true });
};

// Execute the functions
(async () => {
  try {
    if (!(await existFileIpfs(`${statePath}`))) {
      await ipfs.files.mkdir(`${statePath}`);
    }
    if (!(await existFileIpfs(`${outputPath}`))) {
      await ipfs.files.mkdir(`${outputPath}`, { parents: true });
    }
    const txresponse = await getTx();
    console.log("tx is: " + txresponse);
    if (txresponse.lower === undefined || txresponse.higher === undefined) {
      console.log(
        new Error(
          "invalid input: it must be of the format {lower:<integer>,higher:<integer>}"
        )
      );
    }
    const primes = getPrimes(
      parseInt(txresponse.lower),
      parseInt(txresponse.higher)
    );

    console.log(primes);
    await writeFileIpfs(
      `${outputPath}/primes.json`,
      JSON.stringify({ primes: primes })
    );
    await finishTx();
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
})();
