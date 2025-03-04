require('dotenv').config();

const owner = process.env.OWNER || "ocotcat";
const port = process.env.PORT || "3000";  
const token = process.env.TOKEN || "";
const repo = process.env.REPO || "";

export default { owner, port, token };
