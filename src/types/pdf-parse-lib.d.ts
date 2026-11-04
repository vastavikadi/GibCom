declare module "pdf-parse/lib/pdf-parse.js" {
  const parse: (buffer: Buffer, options?: any) => Promise<any>;
  export default parse;
}
