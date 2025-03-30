import React from 'react';
import { Link } from 'react-router-dom';

const blogPosts = [
  {
    id: 1,
    title: "Essential Grooming Tips for Dogs",
    excerpt: "Learn the best practices for keeping your dog well-groomed and healthy all year round.",
    category: "Grooming",
    date: "May 15, 2023",
    imagePlaceholder: "🐕",
    author: "Dr. Sarah Johnson",
    authorRole: "Certified Pet Groomer"
  },
  {
    id: 2,
    title: "Nutrition Guide: Choosing the Right Food for Your Cat",
    excerpt: "Understanding your cat's dietary needs and how to select the best food for their health and wellbeing.",
    category: "Nutrition",
    date: "June 2, 2023",
    imagePlaceholder: "🐈",
    author: "Michael Williams",
    authorRole: "Feline Nutritionist"
  },
  {
    id: 3,
    title: "Basic Training Commands Every Dog Should Know",
    excerpt: "A comprehensive guide to teaching your dog essential commands for a well-behaved companion.",
    category: "Training",
    date: "June 18, 2023",
    imagePlaceholder: "🦮",
    author: "Robert Chen",
    authorRole: "Dog Trainer"
  },
  {
    id: 4,
    title: "Signs Your Pet Might Need Veterinary Attention",
    excerpt: "Learn to recognize the warning signs that indicate your pet requires medical care.",
    category: "Health",
    date: "July 5, 2023",
    imagePlaceholder: "🏥",
    author: "Dr. Emily Thompson",
    authorRole: "Veterinarian"
  },
  {
    id: 5,
    title: "Creating a Pet-Friendly Home Environment",
    excerpt: "Tips and tricks for making your living space safe, comfortable, and stimulating for your pets.",
    category: "Lifestyle",
    date: "July 20, 2023",
    imagePlaceholder: "🏠",
    author: "Jessica Martinez",
    authorRole: "Pet Environment Specialist"
  },
  {
    id: 6,
    title: "Understanding Your Pet's Body Language",
    excerpt: "A guide to decoding what your pet is trying to communicate through their behavior and body language.",
    category: "Behavior",
    date: "August 8, 2023",
    imagePlaceholder: "🐾",
    author: "David Wilson",
    authorRole: "Animal Behaviorist"
  }
];

const Blog = () => {
  return (
    <div className="blog-page">
      {/* Hero Section */}
      <section className="bg-primary-light py-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">Pet Care Tips & Advice</h1>
          <p className="text-xl text-primary-dark max-w-2xl mx-auto">
            Discover helpful articles, guides, and resources to help you provide the best care for your beloved pets.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="bg-secondary rounded-lg overflow-hidden shadow-lg">
            <div className="md:flex">
              <div className="md:w-1/2 bg-primary-light flex items-center justify-center p-12">
                <div className="text-8xl">{blogPosts[0].imagePlaceholder}</div>
              </div>
              <div className="md:w-1/2 p-8 md:p-12">
                <div className="flex items-center mb-4">
                  <span className="bg-primary-light text-primary text-xs px-3 py-1 rounded-full">{blogPosts[0].category}</span>
                  <span className="text-gray-500 text-sm ml-4">{blogPosts[0].date}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-primary mb-4">{blogPosts[0].title}</h2>
                <p className="text-primary-dark mb-6">{blogPosts[0].excerpt}</p>
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-bold">{blogPosts[0].author.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-primary-dark font-semibold">{blogPosts[0].author}</p>
                    <p className="text-gray-500 text-sm">{blogPosts[0].authorRole}</p>
                  </div>
                </div>
                <Link 
                  to={`/blog/${blogPosts[0].id}`}
                  className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-md transition-colors duration-300 inline-block"
                >
                  Read Article
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary mb-12 text-center">Latest Articles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.slice(1).map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
              >
                <div className="h-48 bg-primary-light flex items-center justify-center">
                  <div className="text-6xl">{post.imagePlaceholder}</div>
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-3">
                    <span className="bg-primary-light text-primary text-xs px-2 py-1 rounded-full">{post.category}</span>
                    <span className="text-gray-500 text-xs ml-3">{post.date}</span>
                  </div>
                  <h3 className="text-xl font-bold text-primary mb-3">{post.title}</h3>
                  <p className="text-primary-dark text-sm mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                        <span className="text-xs font-bold">{post.author.charAt(0)}</span>
                      </div>
                      <span className="text-gray-600 text-sm">{post.author}</span>
                    </div>
                    <Link 
                      to={`/blog/${post.id}`}
                      className="text-primary hover:text-primary-dark text-sm font-medium"
                    >
                      Read More →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <button className="bg-white border border-primary text-primary hover:bg-primary hover:text-white px-6 py-3 rounded-md transition-colors duration-300">
              Load More Articles
            </button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-primary mb-8 text-center">Browse by Category</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {["Health", "Nutrition", "Training", "Grooming", "Behavior", "Lifestyle"].map((category) => (
              <div
                key={category}
                className="bg-secondary rounded-lg p-4 text-center hover:bg-primary-light transition-colors duration-300 cursor-pointer"
              >
                <span className="text-primary font-medium">{category}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="py-16 bg-primary-light">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-primary mb-4">Stay Updated</h2>
          <p className="text-primary-dark mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter for the latest pet care tips, articles, and Petzify updates delivered directly to your inbox.
          </p>
          
          <div className="max-w-md mx-auto">
            <form className="flex flex-col sm:flex-row">
              <input
                type="email"
                placeholder="Your email address"
                className="flex-grow px-4 py-3 rounded-l-md sm:rounded-r-none mb-2 sm:mb-0 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-r-md sm:rounded-l-none transition-colors duration-300"
              >
                Subscribe
              </button>
            </form>
            <p className="text-xs text-gray-600 mt-2">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Blog; 