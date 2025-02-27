require('dotenv').config();

const owner = process.env.OWNER || "defaultOwner";
const port = process.env.PORT || "3000";  
const token = process.env.TOKEN || "";

export default { owner, port, token };
