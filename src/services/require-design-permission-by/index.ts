import { attachDesignPermissions } from '../../middleware/can-access-design';

export function requireDesignPermissionsBy(
  designIdFetcher: (this: AuthedContext) => Promise<string>
): any {
  return function*(
    this: AuthedContext,
    next: () => Promise<any>
  ): Generator<any, any, any> {
    const designId: string = yield designIdFetcher.call(this).catch(() => {
      this.throw(404, `Cannot find design with ID: ${designId}`);
    });

    yield attachDesignPermissions.call(this, designId);

    yield next;
  };
}
