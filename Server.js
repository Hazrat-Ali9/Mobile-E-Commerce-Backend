const express = require("express");
const app = express();
const port = process.env.PORT || 7000;
const { MongoClient, ServerApiVersion,ObjectId } = require('mongodb');
const cors = require("cors");
const multer = require('multer');
const path = require('path')
const fs = require('fs');

app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'uploads')));
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, 'uploads') // specify the upload directory
  },
  filename: function (req, file, cb) {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ storage: storage });
const uri = "mongodb+srv://aurthohinparvez:2tdBD4q1zQnAt1ug@cluster0.4scykru.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run (){
    try{
        await client.connect();
        const productCollection = client.db("productCollection").collection("product");
        const userCollection = client.db("userCollection").collection("user");
        const orderCollection = client.db("orderCollection").collection("order");

        app.get("/product", async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
          });

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            
            if (!ObjectId.isValid(id)) {
              return res.status(400).send('Invalid ID');
            }
          
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
          
            if (!result) {
              return res.status(404).send('Student not found');
            }
          
            res.send(result);
          });

          app.post("/product", upload.single('image'), async (req, res) => {
            try {
              const newProduct = {
                name: req.body.name,
                price: req.body.price,
                description: req.body.description,
                image: req.file.filename
              };
          
              const result = await productCollection.insertOne(newProduct);
              res.send(result);
            } catch (error) {
              console.error('Error:', error);
              res.status(500).send('Server Error');
            }
          });
          

          app.put("/product/:id", upload.single('image'), async (req, res) => {
            try {
              const id = req.params.id;
              const data = req.body;
              const filter = { _id: new ObjectId(id) };
              const updateDoc = { $set: {} };
          
              if (data.name) updateDoc.$set.name = data.name;
              if (data.description) updateDoc.$set.description = data.description;
              if (data.price) updateDoc.$set.price = data.price;
              if (req.file) updateDoc.$set.image = req.file.filename; 
              const existingProduct = await productCollection.findOne(filter);
              if (req.file && existingProduct.image) {
                fs.unlinkSync(path.join(__dirname, 'uploads', existingProduct.image)); 
              }
          
              const result = await productCollection.updateOne(filter, updateDoc);
              res.send(result);
            } catch (error) {
              console.error("Error updating product:", error);
              res.status(500).send("Error updating product");
            }
          });

        app.delete("/product/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
          });


          // -------------------------- User ---------------------------------

          app.post("/user", async (req, res) => {
            const newUser = req.body;
            const result = await userCollection.insertOne(newUser);
            res.send(result);
          });

        app.get("/user", async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
          });

      app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "admin";
      res.send({ admin: isAdmin });
    });



    // ----------------------- Order ---------------------------
    app.post("/orders", async (req, res) => {
      const { userName, email, productName, price } = req.body;
      const existingOrder = await orderCollection.findOne({ productName: productName });
    
      if (existingOrder) {
        const existingUserBid = existingOrder.bids.find(bid => bid.email === email);
    
        if (existingUserBid) {
          existingUserBid.userName = userName;
          existingUserBid.price = price;
    
          const result = await orderCollection.updateOne(
            { productName: productName, "bids.email": email },
            { $set: { "bids.$": existingUserBid } }
          );
    
          res.send({ message: "Bid updated successfully." });
        } else {
          const newBid = {
            userName: userName,
            email: email,
            price: price
          };
    
          const result = await orderCollection.updateOne(
            { productName: productName },
            { $push: { bids: newBid } }
          );
    
          res.send({ message: "Bid posted successfully." });
        }
      } else {
        
        const newOrder = {
          productName: productName,
          bids: [{
            userName: userName,
            email: email,
            price: price
          }]
        };
    
        const result = await orderCollection.insertOne(newOrder);
        res.send({ message: "Order posted successfully." });
      }
    });
    
    
    
    
    
    
    
  


    app.get("/orders", async (req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders);
    });
     
    app.get("/orders/:id", async (req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const orders = await orderCollection.findOne(query);
      res.send(orders)
    })


    app.put("/orders/:id", async (req, res) => {
      try {
          const id = req.params.id;
          const data = req.body;
          const filter = { _id: new ObjectId(id) };
          const updateDoc = { $set: {} };
          if (data.price) updateDoc.$set.price = data.price;
  
          const result = await orderCollection.updateOne(filter, updateDoc);
          res.send(result);
      } catch (error) {
          console.error("Error updating order:", error);
          res.status(500).send("Error updating order");
      }
  });


    app.get("/orders/user/:email", async (req, res) => {
      const email=req.params.email
      const query={email:email}
      const users = await orderCollection.find(query).toArray();
      res.send(users);
    });


    }
    finally{}
}

run().catch(console.dir);
app.get("/", (req, res) => {
    res.send("Alhamdulliah Your server is Running");
  });
  app.listen(port, () => {
    console.log("Alhamdullilah Your server is Start");
  });