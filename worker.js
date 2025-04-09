export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 处理根路径请求
    if (path === '/' && request.method === 'GET') {
      return new Response(getHTMLForm(), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // 处理保存请求
    if (path === '/save' && request.method === 'POST') {
      const formData = await request.formData();
      const password = formData.get('password');
      let content = formData.get('content');
      
      if (formData.get('file')) {
        const file = formData.get('file');
        content = await file.text();
      }

      if (!password || !content) {
        return new Response('密码和内容不能为空', { status: 400 });
      }

      // 存储到KV
      await env.CLIPBOARD.put(password, content, { expirationTtl: 604800 }); // 7天过期
      
      return new Response('保存成功！请记住您的密码', {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // 处理获取请求
    if (path === '/get' && request.method === 'POST') {
      const formData = await request.formData();
      const password = formData.get('password');
      
      if (!password) {
        return new Response('请输入密码', { status: 400 });
      }

      const data = await env.CLIPBOARD.get(password);
      
      if (data === null) {
        return new Response('密码错误或数据已过期', { status: 404 });
      }
      
      return new Response(data, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

// 单页HTML表单
function getHTMLForm() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cloud Clipboard</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: auto; }
        textarea { width: 100%; height: 200px; margin-top: 10px; }
        input[type="password"] { width: 100%; padding: 8px; margin: 10px 0; }
        button { padding: 10px 20px; margin: 5px; }
        #result { margin-top: 20px; white-space: pre-wrap; }
      </style>
    </head>
    <body>
      <h1>云剪贴板</h1>
      <input type="password" id="password" placeholder="输入密码">
      <textarea id="content" placeholder="输入内容或查看数据..."></textarea>
      <br>
      <input type="file" id="file">
      <br>
      <button onclick="saveData()">保存</button>
      <button onclick="getData()">获取</button>
      <div id="result"></div>

      <script>
        async function saveData() {
          const password = document.getElementById('password').value;
          const content = document.getElementById('content').value;
          const fileInput = document.getElementById('file');
          const formData = new FormData();
          
          formData.append('password', password);
          if (fileInput.files.length > 0) {
            formData.append('file', fileInput.files[0]);
          } else {
            formData.append('content', content);
          }

          const response = await fetch('/save', {
            method: 'POST',
            body: formData
          });
          
          const result = await response.text();
          document.getElementById('result').textContent = result;
        }

        async function getData() {
          const password = document.getElementById('password').value;
          const formData = new FormData();
          formData.append('password', password);

          const response = await fetch('/get', {
            method: 'POST',
            body: formData
          });
          
          const result = await response.text();
          if (response.ok) {
            document.getElementById('content').value = result;
            document.getElementById('result').textContent = '数据加载成功';
          } else {
            document.getElementById('result').textContent = result;
          }
        }
      </script>
    </body>
    </html>
  `;
}