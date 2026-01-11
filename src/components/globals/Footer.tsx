export function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">


          <div>
            <h4 className="mb-4">Connect</h4>
            <div className="flex space-x-6">
              <a
                href="https://www.facebook.com/sonictales"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                Facebook
              </a>
              <a
                href="https://www.youtube.com/rajeshnaroth"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                YouTube
              </a>
              <a
                href="https://www.instagram.com/rajeshnaroth/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/60 hover:text-white transition-colors"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-white/50 text-sm">
          <p>&copy; 2024 SonicTales. All rights reserved.</p>
          <p>Content Creation • San Jose, CA</p>
        </div>
      </div>
    </footer>
  );
}