function App() {
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1>Branch - Conversational AI</h1>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>Test App</h2>
        <p>If you can see this, React is working correctly!</p>
        <p>Current time: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}

export default App;
