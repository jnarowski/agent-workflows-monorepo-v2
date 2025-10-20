function AboutUs() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-6">About Us</h1>
      <div className="max-w-3xl">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Story</h2>
          <p className="text-lg leading-relaxed mb-4">
            We are a team of passionate developers and designers dedicated to creating
            amazing digital experiences. Our journey started with a simple idea: to build
            products that make a difference in people's lives.
          </p>
          <p className="text-lg leading-relaxed">
            Since our founding, we've grown into a dynamic company that values innovation,
            collaboration, and customer satisfaction above all else.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-lg leading-relaxed">
            To deliver cutting-edge solutions that empower businesses and individuals to
            achieve their goals through technology and creative design.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
          <ul className="space-y-3 text-lg">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Innovation:</strong> We constantly push boundaries and explore new possibilities</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Quality:</strong> We never compromise on the quality of our work</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Integrity:</strong> We build trust through transparency and honesty</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              <span><strong>Collaboration:</strong> We believe in the power of teamwork</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AboutUs;
