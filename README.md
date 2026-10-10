# Formspace

A small 3D-to-AR sharing demo. Upload a model, convert it to a browser-friendly GLB, and get a unique page URL and QR code. The model page uses `<model-viewer>` to offer AR Quick Look on iPhone and Scene Viewer/WebXR on Android.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal. Uploads and their share metadata are stored in `data/` on the server.

## Supported uploads

- GLB and self-contained glTF (models with separate `.bin` or texture files should be exported as GLB first)
- STL, OBJ, and FBX (converted in the browser before upload)

Uploads are limited to 100 MB. GLB/glTF use meters. STL, OBJ, and FBX default to millimeters; choose the source model's units before uploading if needed. OBJ material libraries and external textures are not included when uploading only an OBJ file.

## Share links and AR

Share URLs resolve against the domain serving the app. A locally generated link is only reachable by devices that can reach that local server. For customer-facing links, deploy the app behind a public HTTPS domain. Web-based AR requires a compatible phone/browser and a secure HTTPS context.

The Node server serves the built frontend and API from the same origin. Build with `npm run build`, then run `npm start`. Set `PORT` to change the listening port and `MODEL_STORAGE_DIR` to choose the folder for uploaded models. That folder contains user uploads and metadata, so production hosting must provide persistent disk storage and regular backups; ephemeral container filesystems will lose share links when instances are recreated.

## Free Render demo deployment

`render.yaml` defines a free Render web service for a client demo. The free instance sleeps after 15 minutes without incoming traffic, and its local filesystem is temporary: model uploads and their links can be lost when Render spins the service down, restarts it, or redeploys it. Upload a model shortly before the demo and open its QR link while the service is awake. Do not use this setup for permanent customer links; for that, use persistent storage on a paid instance or external object storage.

To deploy, push this project to a GitHub repository, then in Render choose **New → Blueprint**, connect that repository, review the `formspace-demo` service, and deploy. Render will build the frontend and run the Node server. The service gets a public HTTPS URL, which is used for the share page and QR code.
