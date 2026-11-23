const salesCsv = `Date,Product,Category,Sales,Quantity,Region
2026-01-05,Laptop Pro 16,Electronics,85000,2,North
2026-01-08,Wireless Mouse,Accessories,1200,6,West
2026-01-12,Noise Cancelling Headphones,Electronics,14500,3,South
2026-01-15,Ergonomic Chair,Home & Office,18500,2,North
2026-01-19,Smartwatch Ultra,Wearables,24000,4,East
2026-01-23,4K Monitor 27",Electronics,32000,2,West
2026-01-28,USB-C Multiport Dock,Accessories,3500,5,South
2026-02-02,Mechanical Keyboard,Accessories,5800,4,North
2026-02-06,Desk Mat XL,Accessories,950,8,East
2026-02-10,Standing Desk Electric,Home & Office,29000,1,West
2026-02-14,Tablet Air 11",Electronics,42000,3,North
2026-02-18,Bluetooth Speaker,Electronics,6200,5,South
2026-02-22,Fitness Smartband,Wearables,3900,7,East
2026-02-26,Power Bank 20000mAh,Accessories,2400,6,West
2026-03-02,Webcam 1080p Pro,Accessories,4500,4,North
2026-03-06,Laptop Stand Aluminum,Home & Office,1800,5,South
2026-03-10,External SSD 1TB,Electronics,9800,4,West
2026-03-15,Wireless Earbuds,Wearables,7500,5,East
2026-03-19,Gaming Mousepad RGB,Accessories,1400,6,North
2026-03-24,Office Filing Cabinet,Home & Office,8200,2,South
2026-03-28,Wi-Fi 6 Router,Electronics,5400,3,West
2026-04-02,Microphone USB,Accessories,6800,2,North
2026-04-07,Air Purifier Compact,Home & Office,12500,2,East
2026-04-12,Smart Tracker Tag,Wearables,2100,8,South`;

const studentsCsv = `Student,Subject,Marks,Attendance,Grade
Aarav Sharma,Mathematics,92,96,A+
Diya Patel,Physics,85,91,A
Rohan Verma,Computer Science,78,84,B+
Ananya Iyer,Mathematics,95,98,A+
Kabir Mehta,Chemistry,68,76,B
Pooja Nair,English,88,94,A
Aditya Rao,Physics,74,82,B+
Sneha Kulkarni,Mathematics,91,95,A+
Vikram Malhotra,Computer Science,82,89,A
Ishita Sen,Chemistry,62,72,C
Nikhil Gupta,Physics,89,93,A
Meera Joshi,English,94,97,A+
Arjun Kapoor,Mathematics,76,85,B+
Tanvi Bhatia,Computer Science,96,99,A+
Siddharth Roy,Chemistry,71,80,B
Riya Deshmukh,English,86,90,A
Varun Chopra,Mathematics,64,74,C
Kavya Reddy,Physics,87,92,A
Kunal Jain,Computer Science,90,95,A+
Bhavna Das,Chemistry,79,86,B+
Gaurav Joshi,English,73,81,B+
Neha Kothari,Mathematics,84,88,A`;

const ordersCsv = `Order ID,Customer,Product,Category,Amount,City,Payment Method
ORD-5001,Sophia Miller,Espresso Machine,Appliances,14500,Mumbai,Credit Card
ORD-5002,Liam Johnson,Running Shoes,Footwear,4800,Bengaluru,UPI
ORD-5003,Emma Davis,Organic Coffee Beans,Groceries,1250,Delhi,Net Banking
ORD-5004,Noah Wilson,Yoga Mat Pro,Fitness,2200,Hyderabad,UPI
ORD-5005,Olivia Brown,Air Purifier,Appliances,18900,Pune,Credit Card
ORD-5006,James Taylor,Ceramic Cookware Set,Home Goods,9500,Chennai,Debit Card
ORD-5007,Ava Anderson,Electric Toothbrush,Personal Care,3400,Mumbai,UPI
ORD-5008,Lucas Thomas,Wireless Earbuds,Electronics,7900,Bengaluru,Credit Card
ORD-5009,Mia Jackson,Hydration Flask 1L,Fitness,1800,Delhi,Cash on Delivery
ORD-5010,Ethan White,Fitness Smart Tracker,Electronics,6200,Pune,UPI
ORD-5011,Isabella Harris,Robotic Vacuum,Appliances,26500,Bengaluru,Credit Card
ORD-5012,Alexander Martin,Trail Running Shoes,Footwear,5400,Mumbai,Debit Card
ORD-5013,Charlotte Clark,Aromatherapy Diffuser,Home Goods,2800,Kolkata,UPI
ORD-5014,Benjamin Lewis,Cold Brew Maker,Appliances,3600,Delhi,Credit Card
ORD-5015,Amelia Robinson,Matcha Green Tea,Groceries,1650,Chennai,UPI
ORD-5016,William Walker,Adjustable Dumbbells,Fitness,11200,Hyderabad,Net Banking
ORD-5017,Harper Hall,Facial Cleansing Device,Personal Care,4200,Mumbai,UPI
ORD-5018,Daniel Allen,Noise Canceling Headphones,Electronics,16800,Bengaluru,Credit Card
ORD-5019,Evelyn Young,Ergonomic Lumbar Pillow,Home Goods,2100,Pune,Cash on Delivery
ORD-5020,Henry King,Protein Powder 1kg,Fitness,3200,Delhi,UPI
ORD-5021,Ella Wright,Stand Mixer 5L,Appliances,21000,Mumbai,Credit Card
ORD-5022,Samuel Scott,Hiking Boots Waterproof,Footwear,6900,Bengaluru,UPI`;

const sampleDatasets = [
  {
    id: "sales",
    name: "Sales Performance",
    filename: "sales-performance.csv",
    category: "Sales & Retail",
    description: "Regional sales, top product categories, and transaction quantities across quarterly timeframes.",
    columns: ["Date", "Product", "Category", "Sales", "Quantity", "Region"],
    rowCount: 24,
    csvContent: salesCsv
  },
  {
    id: "students",
    name: "Student Performance",
    filename: "student-performance.csv",
    category: "Education & Academics",
    description: "Academic evaluation across subjects, test marks, attendance rates, and final letter grades.",
    columns: ["Student", "Subject", "Marks", "Attendance", "Grade"],
    rowCount: 22,
    csvContent: studentsCsv
  },
  {
    id: "orders",
    name: "Customer Orders",
    filename: "customer-orders.csv",
    category: "E-Commerce & Retail",
    description: "Order values, product categories, fulfillment cities, and preferred payment methods.",
    columns: ["Order ID", "Customer", "Product", "Category", "Amount", "City", "Payment Method"],
    rowCount: 22,
    csvContent: ordersCsv
  }
];

module.exports = { sampleDatasets };
