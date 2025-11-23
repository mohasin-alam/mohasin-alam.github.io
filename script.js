document.getElementById('viewSourceBtn').addEventListener('click', fetchSourceCode);

// *** আপনার Cloudflare Worker URL (সংশোধিত) এখানে যুক্ত করা হলো ***
const workerUrl = "https://yellow-heart-57a1.csmmohasinalam.workers.dev"; 

function fetchSourceCode() {
    const websiteInput = document.getElementById('websiteUrl').value;
    const outputElement = document.getElementById('sourceCodeOutput');
    const outputArea = document.querySelector('.code-area');
    const statusMessage = document.getElementById('statusMessage');
    const viewButton = document.getElementById('viewSourceBtn'); // বাটন টার্গেট

    if (!websiteInput) {
        alert("অনুগ্রহ করে একটি URL দিন।");
        return;
    }

    // লোডিং শুরু: বাটন ডিজেবল, স্ট্যাটাস আপডেট, কার্সার ইফেক্ট যোগ
    viewButton.disabled = true;
    outputElement.textContent = '';
    outputArea.classList.add('loading'); // CSS অ্যানিমেশনের জন্য
    statusMessage.textContent = 'ওয়েবসাইটের সোর্স কোড আনা হচ্ছে... এনক্রিপশন প্রসেস শুরু হচ্ছে...';
    statusMessage.classList.remove('hidden');
    
    // Worker-কে URL প্যারামিটার সহ কল করার জন্য URL তৈরি
    const fetchWorkerUrl = `${workerUrl}?url=${encodeURIComponent(websiteInput)}`;
    
    fetch(fetchWorkerUrl)
        .then(response => {
            if (!response.ok) {
                // Worker থেকে আসা ত্রুটি (যদি JSON ফরমেটে হয়) হ্যান্ডেল করা
                return response.text().then(text => {
                    try {
                        const data = JSON.parse(text);
                        throw new Error(data.error || `Worker ত্রুটি: HTTP ${response.status}`);
                    } catch (e) {
                        // যদি JSON না হয় বা নেটওয়ার্ক ত্রুটি হয়
                        throw new Error(`নেটওয়ার্ক ত্রুটি: HTTP ${response.status}.`);
                    }
                });
            }
            return response.text();
        })
        .then(htmlCode => {
            // লোডিং শেষ: অ্যানিমেশন এবং স্ট্যাটাস সরান
            statusMessage.classList.add('hidden');
            outputArea.classList.remove('loading');
            viewButton.disabled = false;

            // কোড দেখানো এবং হাইলাইট করা
            outputElement.textContent = htmlCode;
            outputElement.classList.add('language-html');
            Prism.highlightElement(outputElement); 
        })
        .catch(error => {
            // ত্রুটি হলে
            statusMessage.classList.add('hidden');
            outputArea.classList.remove('loading');
            viewButton.disabled = false;
            outputElement.textContent = `[ACCESS DENIED]>> কোড লোড করা যায়নি। ত্রুটি: ${error.message}`;
            console.error('Fetching error:', error);
        });
}
