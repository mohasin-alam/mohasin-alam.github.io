document.getElementById('viewSourceBtn').addEventListener('click', fetchSourceCode);

// *** আপনার Cloudflare Worker URL এখানে যুক্ত করা হলো ***
const workerUrl = "https://yellow-heart-57a1.csmmhoasinalam.workers.dev"; 

function fetchSourceCode() {
    const websiteInput = document.getElementById('websiteUrl').value;
    const outputElement = document.getElementById('sourceCodeOutput');
    const statusMessage = document.getElementById('statusMessage');

    if (!websiteInput) {
        alert("অনুগ্রহ করে একটি URL দিন।");
        return;
    }

    // স্ট্যাটাস আপডেট করুন
    outputElement.textContent = '';
    statusMessage.textContent = 'ওয়েবসাইটের সোর্স কোড আনা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।';
    statusMessage.classList.remove('hidden');
    
    // Worker-কে URL প্যারামিটার সহ কল করার জন্য URL তৈরি
    // workerUrl?url=https://targetwebsite.com এই ফরমেটে কল হবে
    const fetchWorkerUrl = `${workerUrl}?url=${encodeURIComponent(websiteInput)}`;
    
    fetch(fetchWorkerUrl)
        .then(response => {
            if (!response.ok) {
                // Worker থেকে আসা JSON ত্রুটি হ্যান্ডেল করা
                return response.text().then(text => {
                    try {
                        const data = JSON.parse(text);
                        throw new Error(data.error || `Worker থেকে ত্রুটি: HTTP ${response.status}`);
                    } catch (e) {
                        // যদি JSON না হয় (যেমন: "Failed to fetch" বা অন্যান্য নেটওয়ার্ক ত্রুটি)
                        throw new Error(`নেটওয়ার্ক বা Worker ত্রুটি: HTTP ${response.status}.`);
                    }
                });
            }
            return response.text();
        })
        .then(htmlCode => {
            statusMessage.classList.add('hidden');
            // প্রাপ্ত কোড আউটপুট এরিয়াতে দেখানো
            outputElement.textContent = htmlCode;
            
            // Prism.js ব্যবহার করে সিনট্যাক্স হাইলাইট করুন
            outputElement.classList.add('language-html');
            Prism.highlightElement(outputElement); 
        })
        .catch(error => {
            statusMessage.classList.add('hidden');
            // ত্রুটি মেসেজ দেখানো
            outputElement.textContent = `কোড লোড করা যায়নি। ত্রুটি: ${error.message}`;
            console.error('Fetching error:', error);
        });
}
