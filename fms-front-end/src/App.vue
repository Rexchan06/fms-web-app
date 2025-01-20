<template>
  <div id="app">
    <h1>My File Management System</h1>
    
    <div class="form-container">
      <input v-model="newItem.name" placeholder="name">
      <input v-model="newItem.description" placeholder="description">
      <input
        type="file"
        @change="handleFileChange"
        ref="fileInput"
        class="file-input"
      >
      <button @click="addItem">Upload</button>
    </div>

    <hr>

    <div class="items-container">
      <ul>
        <li v-for="item in items" :key="item.id" class="item">
          <div class="item-info">
            <input v-model="item.name">
            <input v-model="item.description">
            <a 
              :href="item.url" 
              class="download-link"
              :download="item.url"
              target="_blank"
            >
              Download {{ item.originalName }}
            </a>
        </div>
          <div class="item-actions">
            <input
              type="file"
              @change="(e) => handleUpdateFile(e, item)"
              ref="`updateFile_${item.id}`"
              class="file-input"
            >
            <button @click="updateItem(item)">Update</button>
            <button @click="deleteItem(item.id)" class="delete-btn">Delete</button>
          </div>
        </li>
      </ul>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "App",
  data() {
    return {
      items: [],
      newItem: {
        name: "",
        description: "",
      },
      selectedFile: null,
      errorMessage: "",
    };
  },

  methods: {
    handleFileChange(event) {
      this.selectedFile = event.target.files[0];
    },

    handleUpdateFile(event, item) {
      item.newFile = event.target.files[0];
    },

    async fetchItems() {
      try {
        const response = await axios.get("https://fms-web-app.onrender.com/items");
        this.items = response.data;
      } catch (error) {
        console.error("Error fetching items:", error);
        this.errorMessage = "Failed to fetch items.";
      }
    },

    async addItem() {
      try {
        if (!this.selectedFile) {
          this.errorMessage = "Please select a file";
          return;
        }

        const formData = new FormData();
        formData.append("name", this.newItem.name);
        formData.append("description", this.newItem.description);
        formData.append("file", this.selectedFile);

        console.log("Sending file:", this.selectedFile);
        console.log("Sending name:", this.newItem.name);
        console.log("Sending description:", this.newItem.description);

        const response = await axios.post("https://fms-web-app.onrender.com/items", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });

        console.log("Upload response:", response.data);

        await this.fetchItems();
        this.newItem.name = "";
        this.newItem.description = "";
        this.selectedFile = null;
        this.errorMessage = "";

        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = "";
        }
      } catch (error) {
        console.error("Error details:", error.response?.data || error.message);
        this.errorMessage = error.response?.data?.error || "Failed to add item. Please try again.";
      }
    },

    async updateItem(item) {
      try {
        const formData = new FormData();
        formData.append("name", item.name);
        formData.append("description", item.description);
        if (item.newFile) {
          formData.append("file", item.newFile);
        }

        await axios.put(`https://fms-web-app.onrender.com/items/${item.id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });
        
        await this.fetchItems();
        item.newFile = null;
        const fileInput = this.$refs[`updateFile_${item.id}`];
        if (fileInput) {
          fileInput.value = "";
        }
      } catch (error) {
        console.error("Error updating item:", error);
        this.errorMessage = "Failed to update item. Please try again.";
      }
    },

    async deleteItem(id) {
      try {
        await axios.delete(`https://fms-web-app.onrender.com/items/${id}`);
        await this.fetchItems();
      } catch (error) {
        console.error("Error deleting item:", error);
        this.errorMessage = "Failed to delete item. Please try again.";
      }
    }
  },

  created() {
    this.fetchItems();
  },
};
</script>

<style scoped>
#app {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  font-size: 2.2em;
}

.form-container {
  margin: 30px 0;
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.items-container {
  margin-top: 30px;
}

.item {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin: 15px 0;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  align-items: center;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: transform 0.2s ease;
}

.item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.item-info {
  flex: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.item-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

ul {
  list-style: none;
  padding: 0;
}

input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s ease;
}

input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
}

.file-input {
  padding: 8px;
  border: 1px dashed #ddd;
  border-radius: 6px;
  background: #f8f9fa;
}

button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

button:hover {
  background-color: #45a049;
}

.icons {
  color: white;
  font-size: 1.2rem;
}

.delete-btn {
  background-color: #dc3545;
}

.delete-btn:hover {
  background-color: #c82333;
}

.download-link {
  color: #2196F3;
  text-decoration: none;
  padding: 8px 16px;
  border: 1px solid #2196F3;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.download-link:hover {
  background-color: #2196F3;
  color: white;
}

.error-message {
  color: #dc3545;
  margin-top: 20px;
  text-align: center;
  padding: 10px;
  background-color: #ffe6e6;
  border-radius: 6px;
  border: 1px solid #ffcccc;
}
</style>
