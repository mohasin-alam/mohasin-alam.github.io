
document.getElementById('viewSourceBtn').addEventListener('click', fetchSourceCode);

const workerUrl = "YOUR_CLOUDFLARE_WORKER_URL"; // ***এই লাইনটি পরে পরিবর্তন করতে হবে***

function fetchSourceCode() {
    const websiteInput = document.getElementById('websiteUrl').value;
    const outputElement = document.getElementById('sourceCodeOutput');
    const statusMessage = document.getElementById('statusMessage');

    if (!websiteInput) {
        alert("অনুগ্রহ করে একটি URL দিন।");
        return;
    }

    outputElement.textContent = '';
    statusMessage.textContent = 'ওয়েবসাইটের সোর্স কোড আনা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।';
    statusMessage.classList.remove('hidden');
    
    const fetchWorkerUrl = `${workerUrl}?url=${encodeURIComponent(websiteInput)}`;
    
    if (workerUrl === "YOUR_CLOUDFLARE_WORKER_URL") {
        outputElement.textContent = "ত্রুটি: Cloudflare Worker URL সেট করা হয়নি। পরবর্তী ধাপের নির্দেশাবলী অনুসরণ করুন।";
        statusMessage.classList.add('hidden');
        return;
    }

    fetch(fetchWorkerUrl)
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    try {
                        const data = JSON.parse(text);
                        throw new Error(data.error || `Worker থেকে ত্রুটি: HTTP ${response.status}`);
                    } catch (e) {
                        throw new Error(`Worker থেকে ত্রুটি: HTTP ${response.status}. ${text.substring(0, 100)}...`);
                    }
                });
            }
            return response.text();
        })
        .then(htmlCode => {
            statusMessage.classList.add('hidden');
            outputElement.textContent = htmlCode;
            
            outputElement.classList.add('language-html');
            Prism.highlightElement(outputElement); 
        })
        .catch(error => {
            statusMessage.classList.add('hidden');
            outputElement.textContent = `কোড লোড করা যায়নি। ত্রুটি: ${error.message}`;
            console.error('Fetching error:', error);
        });
}
