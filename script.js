document.getElementById('viewSourceBtn').addEventListener('click', fetchSourceCode);
document.getElementById('copyCodeBtn').addEventListener('click', copyCode);
document.getElementById('downloadCodeBtn').addEventListener('click', downloadCode);

// *** আপনার Cloudflare Worker URL (সংশোধিত) এখানে যুক্ত করা হলো ***
const workerUrl = "https://delicate-tree-21a6.csmmohasinalam.workers.dev/"; 

function fetchSourceCode() {
    const websiteInput = document.getElementById('websiteUrl').value;
    const outputElement = document.getElementById('sourceCodeOutput');
    const outputArea = document.querySelector('.code-area');
    const statusMessage = document.getElementById('statusMessage');
    const viewButton = document.getElementById('viewSourceBtn');
    const actionButtons = document.getElementById('actionButtons'); // নতুন বাটন এরিয়া

    if (!websiteInput) {
        alert("অনুগ্রহ করে একটি URL দিন।");
        return;
    }

    // লোডিং শুরু: বাটন ডিজেবল, স্ট্যাটাস আপডেট, কার্সার ইফেক্ট যোগ
    viewButton.disabled = true;
    actionButtons.classList.add('hidden'); // বাটন লুকিয়ে রাখুন
    outputElement.textContent = '';
    outputArea.classList.add('loading'); // কীবোর্ড কার্সার দেখাবে
    statusMessage.textContent = 'ওয়েবসাইটের সোর্স কোড আনা হচ্ছে... এনক্রিপশন প্রসেস শুরু হচ্ছে...';
    statusMessage.classList.remove('hidden');
    
    // Worker-কে URL প্যারামিটার সহ কল করার জন্য URL তৈরি
    const fetchWorkerUrl = `${workerUrl}?url=${encodeURIComponent(websiteInput)}`;
    
    fetch(fetchWorkerUrl)
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    try {
                        const data = JSON.parse(text);
                        throw new Error(data.error || `Worker ত্রুটি: HTTP ${response.status}`);
                    } catch (e) {
                        throw new Error(`নেটওয়ার্ক ত্রুটি: HTTP ${response.status}.`);
                    }
                });
            }
            return response.text();
        })
        .then(htmlCode => {
            // লোডিং শেষ
            statusMessage.classList.add('hidden');
            outputArea.classList.remove('loading');
            viewButton.disabled = false;
            actionButtons.classList.remove('hidden'); // বাটন দেখান

            // কোড দেখানো
            outputElement.textContent = htmlCode;
            outputElement.classList.add('language-html');
            Prism.highlightElement(outputElement); 
        })
        .catch(error => {
            // ত্রুটি হলে
            statusMessage.classList.add('hidden');
            outputArea.classList.remove('loading');
            viewButton.disabled = false;
            actionButtons.classList.add('hidden'); // ত্রুটি হলে বাটন লুকিয়ে রাখুন
            outputElement.textContent = `[ACCESS DENIED]>> কোড লোড করা যায়নি। ত্রুটি: ${error.message}`;
            console.error('Fetching error:', error);
        });
}

function copyCode() {
    const code = document.getElementById('sourceCodeOutput').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('কোড সফলভাবে কপি করা হয়েছে!');
    }).catch(err => {
        alert('কপি করতে ব্যর্থ হয়েছে। অনুগ্রহ করে ম্যানুয়ালি কপি করুন।');
        console.error('Copy failed:', err);
    });
}

function downloadCode() {
    const code = document.getElementById('sourceCodeOutput').textContent;
    const urlInput = document.getElementById('websiteUrl').value || 'untitled';
    
    // URL থেকে ডোমেইন নাম বের করার চেষ্টা
    let filename;
    try {
        const urlObj = new URL(urlInput.startsWith('http') ? urlInput : `https://${urlInput}`);
        filename = urlObj.hostname.replace('www.', '').replace(/\./g, '_');
    } catch (e) {
        filename = 'source_code';
    }

    const blob = new Blob([code], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.html`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`'${filename}.html' ডাউনলোড করা হচ্ছে...`);
}
