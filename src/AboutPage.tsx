export function AboutPage() {
  return (
    <div className="bg-white shadow-xl rounded-lg p-6 md:p-8 space-y-6">
      <h2 className="text-3xl font-bold text-primary text-center">About Hide & Seek Game Finder</h2>
      
      <p className="text-lg text-gray-700">
        This application is inspired by the exciting Hide and Seek format popularized by content creators on Nebula,
        often seen in series like Jet Lag: The Game. Our goal is to bring that thrill to local communities,
        allowing players to easily organize and join their own Hide and Seek card games.
      </p>

      <div className="space-y-3">
        <h3 className="text-2xl font-semibold text-gray-800">How it Works</h3>
        <p className="text-gray-600">
          Players can create profiles, host new game sessions specifying details like location, time, and any special rules,
          or browse existing games in their area to join. The core idea is to facilitate in-person games where
          participants use a pre-determined set of cards or rules to find each other or complete objectives.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-2xl font-semibold text-gray-800">Key Features</h3>
        <ul className="list-disc list-inside text-gray-600 space-y-1 pl-4">
          <li>User authentication and profiles.</li>
          <li>Create and manage game sessions.</li>
          <li>Browse and filter available game sessions.</li>
          <li>View details of game sessions, including host and participant information (once implemented).</li>
          <li>Real-time updates for new sessions and participants.</li>
        </ul>
      </div>
      
      <p className="text-gray-600">
        This platform is a passion project and is continuously being developed. We hope you have fun finding your next adventure!
      </p>

      <div className="text-center pt-4">
        <p className="text-sm text-gray-500">
          Disclaimer: This app is a fan-made project and is not affiliated with Nebula, Jet Lag: The Game, or any specific content creators. 
          Always prioritize safety and play responsibly in public spaces.
        </p>
      </div>
    </div>
  );
}
