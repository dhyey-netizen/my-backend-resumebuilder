require("dotenv").config()

const express = require("express")
const { MongoClient, ObjectId } = require("mongodb")
const cors = require("cors")
const jwt = require("jsonwebtoken")

const app = express()
const PORT = process.env.PORT || 8080

app.use(cors())
app.use(express.json())

// 🔐 ENV
const MONGO_URI = process.env.MONGO_URI
const JWT_SECRET = process.env.JWT_SECRET

// 🌐 Mongo Client
const client = new MongoClient(MONGO_URI)

let db

// 🔌 Connect DB FIRST, then start server
async function startServer() {
    try {
        await client.connect()
        db = client.db("Project")
        console.log("MongoDB Connected 🔥")

        app.listen(PORT, () => {
            console.log(`Server running on ${PORT} 🚀`)
        })
    } catch (err) {
        console.error("DB connection failed:", err)
    }
}

startServer()

// ================= AUTH =================

// Register
app.post("/register", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const { fullname, email, password } = req.body

        const existing = await db.collection("Users").findOne({ email })
        if (existing) {
            return res.status(400).json({ msg: "User already exists" })
        }

        const result = await db.collection("Users").insertOne({
            fullname,
            email,
            password
        })

        res.json({
            msg: "User registered",
            id: result.insertedId
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Server error", error: error.message })
    }
})

// Login
app.post("/login", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const { email, password } = req.body

        const user = await db.collection("Users").findOne({ email })

        if (!user) {
            return res.status(404).json({ msg: "User not found" })
        }

        if (user.password !== password) {
            return res.status(401).json({ msg: "Incorrect password" })
        }

        const token = jwt.sign({
            userId: user._id,
            email: user.email,
            fullname: user.fullname
        }, JWT_SECRET, { expiresIn: "1h" })

        res.json({
            msg: "Login success",
            token
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Server error", error: error.message })
    }
})

// ================= JWT =================

function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"]

    if (!authHeader) {
        return res.status(401).json({ msg: "No token" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        res.status(403).json({ msg: "Invalid token" })
    }
}

// ================= USER DATA =================

// Save
app.post("/save-user-details", verifyToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const data = {
            ...req.body,
            email: req.user.email
        }

        await db.collection("userDetails").insertOne(data)

        res.send("Saved successfully")

    } catch (error) {
        console.error(error)
        res.status(500).send("Server error")
    }
})

// Get all
app.get("/get-user-details", verifyToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const data = await db.collection("userDetails")
            .find({ email: req.user.email })
            .toArray()

        res.send(data)

    } catch (error) {
        console.error(error)
        res.status(500).send("Server error")
    }
})

// Delete
app.delete("/delete-usr-detail/:id", verifyToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const result = await db.collection("userDetails")
            .deleteOne({ _id: new ObjectId(req.params.id) })

        res.json({
            msg: "Deleted",
            deletedCount: result.deletedCount
        })

    } catch (error) {
        console.error(error)
        res.status(500).send("Server error")
    }
})