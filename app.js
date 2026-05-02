require("dotenv").config()

const express = require("express")
const { MongoClient, ObjectId } = require("mongodb")
const cors = require("cors")
const jwt = require("jsonwebtoken")

const app = express()
const PORT = process.env.PORT || 8080

// 🔐 Secret from .env
const SECRET_KEY = process.env.JWT_SECRET

// 🌐 MongoDB Atlas URI
const url = process.env.MONGO_URI

// ✅ NEW MongoDB (NO old options)
const client = new MongoClient(url)

// 🔌 Connect DB
async function connectDB() {
    try {
        await client.connect()
        console.log("MongoDB Connected 🔥")
    } catch (err) {
        console.error("DB Error:", err)
    }
}
connectDB()

// Middleware
app.use(cors())
app.use(express.json())

// ================= AUTH =================

// Register
app.post('/register', async (req, res) => {
    try {
        const db = client.db("Project")

        const existingUser = await db.collection("Users")
            .findOne({ email: req.body.email })

        if (existingUser) {
            return res.status(400).json({ msg: "User Already Exists." })
        }

        const data = {
            fullname: req.body.fullname,
            email: req.body.email,
            password: req.body.password
        }

        const result = await db.collection("Users").insertOne(data)

        res.json({
            msg: "User Registered Successfully",
            id: result.insertedId
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Server Error" })
    }
})

// Login
app.post("/login", async (req, res) => {
    try {
        const db = client.db("Project")

        const { email, password } = req.body

        const user = await db.collection("Users").findOne({ email })

        if (!user) {
            return res.status(404).json({ msg: "No User found." })
        }

        if (user.password !== password) {
            return res.status(401).json({ msg: "Incorrect Password." })
        }

        const token = jwt.sign({
            userId: user._id,
            email: user.email,
            fullname: user.fullname
        }, SECRET_KEY, { expiresIn: "1h" })

        res.json({
            msg: "Login Successful",
            token
        })

    } catch (error) {
        console.log(error)
        res.status(500).json({ msg: "Server Error" })
    }
})

// ================= USER =================

app.get("/usrdetails", verifyToken, (req, res) => {
    res.send(req.user.email)
})

// ================= RESUME =================

// Save
app.post('/save-user-details', verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")

        const data = {
            ...req.body,
            email: req.user.email
        }

        await db.collection("userDetails").insertOne(data)

        res.send("Data Inserted Successfully")

    } catch (error) {
        console.log(error)
        res.status(500).send("Server Error")
    }
})

// Get all
app.get("/get-user-details", verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")

        const data = await db.collection("userDetails")
            .find({ email: req.user.email })
            .toArray()

        if (data.length === 0) {
            return res.send("No Data Found")
        }

        res.send(data)

    } catch (error) {
        console.log(error)
        res.status(500).send("Server Error")
    }
})

// Get specific
app.get("/specific-usr-detail/:id", verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")

        const data = await db.collection("userDetails")
            .findOne({ _id: new ObjectId(req.params.id) })

        if (!data) {
            return res.send("No Data Found")
        }

        res.send(data)

    } catch (error) {
        console.log(error)
        res.status(500).send("Server Error")
    }
})

// Update
app.put("/update-usr-details/:id", verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")

        const result = await db.collection("userDetails")
            .updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: req.body }
            )

        res.json({
            msg: "Data Updated Successfully",
            modifiedCount: result.modifiedCount
        })

    } catch (error) {
        console.log(error)
        res.status(500).send("Server Error")
    }
})

// Delete
app.delete("/delete-usr-detail/:id", verifyToken, async (req, res) => {
    try {
        const db = client.db("Project")

        const result = await db.collection("userDetails")
            .deleteOne({ _id: new ObjectId(req.params.id) })

        if (result.deletedCount === 0) {
            return res.status(404).json({ msg: "No Data Found" })
        }

        res.json({ msg: "Data Deleted Successfully" })

    } catch (error) {
        console.log(error)
        res.status(500).send("Server Error")
    }
})

// ================= JWT =================

function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"]

    if (!authHeader) {
        return res.status(401).json({ msg: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, SECRET_KEY)
        req.user = decoded
        next()
    } catch (error) {
        return res.status(403).json({ msg: "Invalid Token" })
    }
}

// ================= START =================

app.listen(PORT, () => {
    console.log(`Server running on ${PORT} 🚀`)
})