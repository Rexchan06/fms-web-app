const { createClient } = require('@supabase/supabase-js')
const express = require('express');
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
require('dotenv').config();

const app = express();
const PORT = 3002;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configure multer for memory storage instead of disk
const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
        console.log("Received file:", file);
        cb(null, true);
    }
});

//Middleware
app.use(cors());
app.use(bodyParser.json());

// CRUD Logic

//Get all items
app.get('/items', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('items')
            .select('*');
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/files/:id', async (req, res) => {
    try {
        const { data: item, error: itemError } = await supabase
            .from('items')
            .select('*')
            .eq('id', req.params.id)
            .single();
        
        if (itemError) throw itemError;
        if (!item) {
            return res.status(404).send('File not found');
        }

        const { data, error } = await supabase
            .storage
            .from('uploads')
            .download(item.filepath);

        if (error) throw error;

        res.setHeader('Content-Disposition', `attachment; filename="${item.originalName}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        // Send the file
        const buffer = Buffer.from(await data.arrayBuffer());
        res.send(buffer);
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
        const filename = `${Date.now()}-${req.file.originalname}`;

        // Upload file to Supabase Storage
        const { data: fileData, error: uploadError } = await supabase
            .storage
            .from('uploads') 
            .upload(filename, req.file.buffer, {
                contentType: req.file.mimetype
            });

        if (uploadError) throw uploadError;

        // Get the public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('uploads') 
            .getPublicUrl(filename);

        // Insert record into Supabase database
        const { data: item, error: dbError } = await supabase
            .from('items')
            .insert([{
                name,
                description,
                filepath: filename,
                originalName: req.file.originalname,
                url: publicUrl
            }])
            .select()
            .single();

        if (dbError) throw dbError;

        console.log("Successfully created item:", item);
        res.json(item);
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
        const { data: existingItem, error: fetchError } = await supabase
            .from('items')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existingItem) {
            return res.status(404).send("Item not found");
        }

        // If there is a new file, update file information
        if (file) {
            const filename = `${Date.now()}-${file.originalname}`;

            // Delete the old file
            await supabase
                .storage
                .from('uploads') 
                .remove([existingItem.filepath]);

            // Upload new file
            const { error: uploadError } = await supabase
                .storage
                .from('uploads') 
                .upload(filename, file.buffer, {
                    contentType: file.mimetype
                });

            if (uploadError) throw uploadError;

            // Get new public URL
            const { data: { publicUrl } } = supabase
                .storage
                .from('uploads') 
                .getPublicUrl(filename);

            // Update database record
            const { data: updatedItem, error: updateError } = await supabase
                .from('items')
                .update({
                    name: name || existingItem.name,
                    description: description || existingItem.description,
                    filepath: filename,
                    originalName: file.originalname,
                    url: publicUrl
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            res.json(updatedItem);
        } else {
            // If no new file, just update text fields
            const { data: updatedItem, error: updateError } = await supabase
                .from('items')
                .update({
                    name: name || existingItem.name,
                    description: description || existingItem.description
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            res.json(updatedItem);
        }
    } catch (err) {
        console.error("Error updating item:", err);
        res.status(500).send(err.message);
    }
});

//Delete an item
app.delete('/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Get the file path before deleting
        const { data: item, error: fetchError } = await supabase
            .from('items')
            .select('filepath')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Delete the file from storage
        if (item && item.filepath) {
            const { error: deleteFileError } = await supabase
                .storage
                .from('uploads') 
                .remove([item.filepath]);

            if (deleteFileError) throw deleteFileError;
        }

        // Delete the database record
        const { error: deleteRecordError } = await supabase
            .from('items')
            .delete()
            .eq('id', id);

        if (deleteRecordError) throw deleteRecordError;

        res.json({ message: "Item deleted" });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});