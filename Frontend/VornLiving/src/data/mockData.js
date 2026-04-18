export const mockCategories = [
    { id: 1, name: "Kitchen", image: "/Kitchen/Spice rack.png", slug: "kitchen" },
    { id: 2, name: "Bathroom", image: "/Bathroom/bathroom shelf.png", slug: "bathroom" },
    { id: 3, name: "Living", image: "/Living/Book Shelf.png", slug: "living" },
    { id: 4, name: "Study Room", image: "/Living/Laptop stand.png", slug: "study-room" }
];

export const mockProducts = [
    {
        id: 101,
        name: "Modern Towel Hook",
        price: 25.00,
        discount: 10,
        rating: 4.5,
        reviews: 120,
        image: "/Bathroom/towel hook.png",
        category: "Bathroom",
        slug: "modern-towel-hook",
        description: "Elegant stainless steel towel hook for modern bathrooms.",
        stock: 20,
        isNew: true
    },
    {
        id: 102,
        name: "Corner Soap Holder",
        price: 35.00,
        discount: 0,
        rating: 4.2,
        reviews: 85,
        image: "/Bathroom/Corner soap holder.png",
        category: "Bathroom",
        slug: "corner-soap-holder",
        description: "Space-saving corner soap holder with drainage.",
        stock: 15,
        isNew: false
    },
    {
        id: 103,
        name: "Premium Spice Rack",
        price: 45.00,
        discount: 15,
        rating: 4.8,
        reviews: 200,
        image: "/Kitchen/Spice rack.png",
        category: "Kitchen",
        slug: "premium-spice-rack",
        description: "Organize your spices with this premium rack.",
        stock: 50,
        isNew: true
    },
    {
        id: 104,
        name: "Wooden Book Shelf",
        price: 120.00,
        discount: 5,
        rating: 4.7,
        reviews: 45,
        image: "/Living/Book Shelf.png",
        category: "Living",
        slug: "wooden-book-shelf",
        description: "Sturdy wooden book shelf for your living room.",
        stock: 10,
        isNew: false
    },
    {
        id: 105,
        name: "Adjustable Laptop Stand",
        price: 55.00,
        discount: 0,
        rating: 4.6,
        reviews: 150,
        image: "/Living/Laptop stand.png",
        category: "Study Room",
        slug: "adjustable-laptop-stand",
        description: "Ergonomic laptop stand for better posture.",
        stock: 30,
        isNew: true
    },
    {
        id: 106,
        name: "Kitchen Tissue Holder",
        price: 15.00,
        discount: 0,
        rating: 4.3,
        reviews: 90,
        image: "/Kitchen/Kitchen tissue holder.png",
        category: "Kitchen",
        slug: "kitchen-tissue-holder",
        description: "Convenient tissue holder for your kitchen counter.",
        stock: 40,
        isNew: false
    },
     {
        id: 107,
        name: "Coat Rack",
        price: 65.00,
        discount: 20,
        rating: 4.4,
        reviews: 60,
        image: "/Living/Coat rack.png",
        category: "Living",
        slug: "coat-rack",
        description: "Stylish coat rack for your hallway or living area.",
        stock: 12,
        isNew: true
    }
];

export const mockBanners = [
    {
        id: 1,
        title: "Elegant Bathroom Accessories",
        subtitle: "Upgrade Your Space",
        image: "/Bathroom/bathroom shelf.png",
        link: "/category/bathroom"
    },
    {
        id: 2,
        title: "Organize Your Kitchen",
        subtitle: "Premium Racks & Holders",
        image: "/Kitchen/Bottle rack.png",
        link: "/category/kitchen"
    },
    {
        id: 3,
        title: "Living Room Essentials",
        subtitle: "Modern & Stylish",
        image: "/Living/Book Shelf.png",
        link: "/category/living"
    },
    {
        id: 4,
        title: "Study in Comfort",
        subtitle: "Ergonomic Designs",
        image: "/Living/Laptop stand.png",
        link: "/category/study-room"
    }
];
