const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./db")

const app = express();
const PORT = 3002;

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        console.log("Processing file:", file);
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        console.log("Received file:", file);
        cb(null, true);
    }
});

//Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve uploaded files
app.use('/media', express.static(path.join(__dirname, 'uploads')));

// CRUD Logic

//Get all items
app.get('/items', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM items");
        res.json(rows);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/files/:id', async (req, res) => {
    try {
        const [item] = await db.query("SELECT * FROM items WHERE id = ?", [req.params.id]);
        
        if (!item || item.length === 0) {
            return res.status(404).send('File not found');
        }

        const file = item[0];
        const filePath = path.join(__dirname, "uploads", file.filepath);

        // Check if file exists
        console.log("Checking if file exists:", filePath);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('File not found on server');
        }

        // Set content disposition
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Send the file
        res.sendFile(filePath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).send('Error downloading file');
    }
});

//Create Items
app.post('/items', upload.single("file"), async (req, res) => {
    try {
        console.log("Request body:", req.body);
        console.log("Request file:", req.file);

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { name, description } = req.body;
        const filename = req.file.filename;
        const originalName = req.file.originalname;

        console.log("Inserting into database:", {
            name,
            description,
            filename,
            originalName
        });

        const [result] = await db.query(
            "INSERT INTO items (name, description, filepath, originalName) VALUES (?, ?, ?, ?)", 
            [name, description, filename, originalName]
        );

        const newItem = {
            id: result.insertId,
            name,
            description,
            filepath: filename,
            originalName
        };

        console.log("Successfully created item:", newItem);
        res.json(newItem);
    } catch (err) {
        console.error("Error in POST /items:", err);
        res.status(500).json({ 
            error: err.message,
            details: err.stack 
        });
    }
});

//Update an item
app.put('/items/:id', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    const file = req.file;

    try {
        // Get the existing item
        const [existingItem] = await db.query(
            "SELECT * FROM items WHERE id = ?", 
            [id]
        );

        if (!existingItem || existingItem.length === 0) {
            return res.status(404).send("Item not found");
        }

        // If there is a new file, update file information
        if (file) {
            const filename = req.file.filename;
            // Delete the old file if it exists
            if (existingItem[0].filepath) {
                fs.unlink(existingItem[0].filepath, (err) => {
                    if (err) console.error("Error deleting old file:", err);
                });
            }

            await db.query(
                "UPDATE items SET name = ?, description = ?, filepath = ?, originalName = ? WHERE id = ?",
                [
                    name || existingItem[0].name,
                    description || existingItem[0].description,
                    filename,
                    file.originalname,
                    id
                ]
            );
        } else {
            // If no new file, just update text fields
            await db.query(
                "UPDATE items SET name = ?, description = ? WHERE id = ?",
                [
                    name || existingItem[0].name,
                    description || existingItem[0].description,
                    id
                ]
            );
        }

        res.json({ id, name, description });
    } catch (err) {
        console.error("Error updating item:", err);
        res.status(500).send(err.message);
    }
});

//Delete an item
app.delete('/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        //Get the file path before deleting the record
        const [file] = await db.query("SELECT filepath FROM items WHERE id = ?", [id]);

        //Delete the file if it exists
        if (file[0] && file[0].filepath) {
            fs.unlink(file[0].filepath, (err) => {
                if (err) console.error("Error deleting file:", err);
            });
        }

        await db.query("DELETE FROM items WHERE id = ?", [id]);
        res.json({ message: "Items deleted" });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Starting server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});