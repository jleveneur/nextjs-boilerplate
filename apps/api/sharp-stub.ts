/**
 * The API graph can pull `sharp` transitively (worker image tooling). The API
 * never calls it; this stub keeps the Docker runner free of native deps.
 */
const unavailable = (): never => {
  throw new Error("sharp is not available in apps/api");
};

const sharpStub = new Proxy(unavailable, {
  apply: unavailable,
  get: unavailable,
});

export default sharpStub;
