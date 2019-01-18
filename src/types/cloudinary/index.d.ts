declare module 'cloudinary' {
  function config(newConfig: object): object;

  namespace utils {
    interface SignedUrlOptions {
      api_key: string;
      api_secret: string;
    }

    type UploadPolicyRequest = object & {
      public_id: string;
      timestamp: number;
      folder: string;
    };

    type UploadPolicyResponse = UploadPolicyRequest & {
      signature: string;
      api_key: string;
    };

    function sign_request(
      params: UploadPolicyRequest,
      options: SignedUrlOptions
    ): UploadPolicyResponse;
  }
}
