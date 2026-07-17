export class ApiResponse<T> {
  constructor(
    public success: boolean,
    public message: string,
    public data?: T,
    public meta?: unknown
  ) {}

  static success<T>(
    message: string,
    data?: T,
    meta?: unknown
  ) {
    return new ApiResponse(true, message, data, meta);
  }

  static error(message: string) {
    return new ApiResponse(false, message);
  }
}  