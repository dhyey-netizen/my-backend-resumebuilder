require("dotenv").config()

const express = require("express")
const { MongoClient, ObjectId } = require("mongodb")
const cors = require("cors")
const jwt = require("jsonwebtoken")

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 8080
const MONGO_URI = process.env.MONGO_URI
const JWT_SECRET = process.env.JWT_SECRET

// 🔐 safety checks
if (!MONGO_URI) {
    console.error("❌ MONGO_URI missing")
    process.exit(1)
}
if (!JWT_SECRET) {
    console.error("❌ JWT_SECRET missing")
    process.exit(1)
}

const client = new MongoClient(MONGO_URI)
let db

// 🚀 START SERVER AFTER DB CONNECT
async function startServer() {
    try {
        await client.connect()
        db = client.db("Project")
        console.log("MongoDB Connected 🔥")

        app.listen(PORT, () => {
            console.log(`Server running on ${PORT} 🚀`)
        })

    } catch (err) {
        console.error("❌ DB ERROR:", err)
        process.exit(1)
    }
}

startServer()

// ================= JWT =================

function verifyToken(req, res, next) {
    const authHeader = req.headers["authorization"]

    if (!authHeader) {
        return res.status(401).json({ msg: "No token provided" })
    }

    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return res.status(403).json({ msg: "Invalid token" })
    }
}

// ================= AUTH =================

// Register
app.post("/register", async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const { fullname, email, password } = req.body

        const existingUser = await db.collection("Users").findOne({ email })
        if (existingUser) {
            return res.status(400).json({ msg: "User already exists" })
        }

        const result = await db.collection("Users").insertOne({
            fullname,
            email,
            password
        })

        res.json({
            msg: "User registered successfully",
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
            msg: "Login successful",
            token
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ msg: "Server error", error: error.message })
    }
})

// ================= USER =================

app.get("/usrdetails", verifyToken, (req, res) => {
    res.send(req.user.email)
})

// ================= RESUME =================

// Save
app.post("/save-user-details", verifyToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const data = {
            ...req.body,
            email: req.user.email
        }

        await db.collection("userDetails").insertOne(data)

        res.send("Data inserted successfully")

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

        if (data.length === 0) {
            return res.send("No data found")
        }

        res.send(data)

    } catch (error) {
        console.error(error)
        res.status(500).send("Server error")
    }
})

// Get specific
app.get("/specific-usr-detail/:id", verifyToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const data = await db.collection("userDetails")
            .findOne({ _id: new ObjectId(req.params.id) })

        if (!data) {
            return res.send("No data found")
        }

        res.send(data)

    } catch (error) {
        console.error(error)
        res.status(500).send("Server error")
    }
})

// Update
app.put("/update-usr-details/:id", verifyToken, async (req, res) => {
    try {
        if (!db) return res.status(500).json({ msg: "DB not ready" })

        const result = await db.collection("userDetails")
            .updateOne(
                { _id: new ObjectId(req.params.id) },
                { $set: req.body }
            )

        res.json({
            msg: "Updated successfully",
            modifiedCount: result.modifiedCount
        })

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

        if (result.deletedCount === 0) {
            return res.status(404).json({ msg: "No data found" })
        }

        res.json({ msg: "Deleted successfully" })

    } catch (error) {
        console.error(error)
        res.status(500).send("Server error")
    }
})