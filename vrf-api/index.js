const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());

// Endpoint to run the VRF script
app.get('/api/run-vrf', (req, res) => {
    const scriptPath = path.resolve(__dirname, '../scripts/run_ecvrf_demo.sh');

    exec(`bash ${scriptPath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(stderr);
            return res.status(500).json({ error: 'Script execution failed' });
        }

        try {
            const result = JSON.parse(stdout);
            res.json({
                publicKey: result.publicKey,
                inputString: result.inputString,
                proof: result.proof,
                vrfOutput: result.vrfOutput
            });
        } catch (e) {
            console.error('Failed to parse script output as JSON:', stdout);
            res.status(500).json({ error: 'Invalid JSON from script' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ VRF API running at http://localhost:${PORT}`);
});
