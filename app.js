const { ObjectId } = require('mongodb')
const express = require('express')
const { MongoClient } = require('mongodb')
const cors = require('cors')
const url = "mongodb://localhost:27017/"
const jwt = require('jsonwebtoken')
const PORT = process.env.PORT || 8080;
const app = express()

const SECRET_KEY = 'priyansh1017'

const client = new MongoClient(url)

async function connectDB() {
    try {
        await client.connect();
        console.log("MongoDB Connected");
    } catch (err) {
        console.error(err);
    }
}
connectDB();

app.use(cors())
app.use(express.json())
app.post('/register', async (req, res) => {
    try {
        const db = client.db("Project")

        const checkUsers = await db.collection("Users").findOne({ email: req.body.email })

        if (checkUsers) {
            return res.send("User Already Exists.")
        }
        
        var data = {
            fullname: req.body.fullname,
            email: req.body.email,
            password: req.body.password
        }
        const result = await db.collection("Users").insertOne(data)
        console.log("Data inserted successfully");

        res.json({
            msg: "Data inserted successfully",
            id: `Inserted ID: ${result.insertedId}`
        })
    } 
    catch (error) {
        console.log(error)
    }
})

app.post("/login", async (req, res) => {
    try {
        const db = client.db("Project")
        
        const userInfo = {
            email: req.body.email,
            password: req.body.password
        }

        const findUser = await db.collection("Users").findOne({ email: userInfo.email })

        if (!findUser) {
            return res.status(404).json({ msg: "No User found." })  
        }

        if (findUser.password !== userInfo.password) {
            return res.status(401).json({ msg: "Incorrect Password." })
        }

        const token = jwt.sign({
            userId: findUser._id,
            email: findUser.email,
            fullname: findUser.fullname 
        }, SECRET_KEY, { expiresIn: "1h" })

        return res.json({msg: "Login Successfully.", token})
    } 
    catch (error) {
        console.log(error)
    }
})

app.get("/usrdetails", verifyToken, (req, res) => {
    if (!req.user.email) {
        return res.send("User not Logged In")
    }
    return res.send(req.user.email)
})


// ------------- Resume Data Part -------------

// Resume stored
app.post('/save-user-details', verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")

        const usrDetails = {
            ...req.body,
            email: req.user.email
        }

        if (!usrDetails) {
            return res.status(404).json({ msg: "No Data found." })  
        }

        var collection = await db.collection("userDetails").insertOne(usrDetails)

        return res.send("Data Inserted Successfully.")
    } catch (error) {
        console.log(error)
    }
})

app.get("/get-user-details", verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")

        var usrDetails = await db.collection("userDetails").find(
            { email: req.user.email }).toArray()

        if (usrDetails.length === 0) {
            return res.send("No Data Found.")
        }

        return res.send(usrDetails)
    } catch (error) {
        console.log(error)
    }
})

app.get("/specific-usr-detail/:id", verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")
        const id = req.params.id

        const usrDetails = await db.collection("userDetails")
            .findOne({ _id: new ObjectId(id) })

        if (usrDetails.length === 0) {
            return res.send("No Data Found.")
        }

        return res.send(usrDetails)
    } catch (error) {
        console.log(error)
        res.status(500).send("Server Error")
    }
})

app.put("/update-usr-details/:id", verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")
        const id = req.params.id
        const data = req.body
    
        const usrDetails = await db.collection("userDetails")
            .findOne({ _id: new ObjectId(id)})

        if (!usrDetails) {
            return res.send("No Data Found.")
        }

        const updatedData = await db.collection("userDetails")
            .updateOne(
                { _id: new ObjectId(id)}, 
                { $set: data}
            )
        
        res.json({
            msg: "Data Updated Successfully",
            modifiedCount: updatedData.modifiedCount
        })
    } 
    catch (error) {
        console.log(error)
        res.status(500).send("Server Error")
    }
})

app.delete("/delete-usr-detail/:id", verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")
        const id = req.params.id

        const result = await db.collection("userDetails").deleteOne({ _id: new ObjectId(id) })

        if (result.deletedCount === 0) {
            return res.status(404).json({
                msg: "No Data Found"
            })
        }

        res.json({
            msg: "Data Deleted Successfully",
        })
    } 
    catch (error) {
        console.log(error)
        res.status(500).send("Server Error")
    }
})

app.listen(port, () => {
    console.log(`Server running on ${port} port.`)
})

function verifyToken (req, res, next) {
    const authHeader = req.headers["authorization"]

    if (!authHeader) {
        return res.status(401).json({ msg: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, SECRET_KEY)
        req.user = decoded
        next()    
    } 
    catch (error) {
        return res.status(403).json({ msg: "Invalid Token" })
    }
}
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});