import { utils } from 'fsh-sushi';
import { OptimizerPlugin } from '../OptimizerPlugin';
import { optimizeURL } from '../utils';
import { Package } from '../../processor';
import { MasterFisher, ProcessingOptions } from '../../utils';
import { isUri } from 'valid-url';

const FISHER_TYPES = [
  utils.Type.Resource,
  utils.Type.Type,
  utils.Type.Profile,
  utils.Type.Extension,
  utils.Type.Logical
];

export default {
  name: 'resolve_context_urls',
  description: 'Replace declared extension context URLs with their names or aliases',

  optimize(pkg: Package, fisher: MasterFisher, options: ProcessingOptions = {}): void {
    for (const extension of pkg.extensions) {
      if (extension.contexts) {
        extension.contexts.forEach(context => {
          if (!context.isQuoted) {
            // if the context is an extension, value is just a url without a #
            // if the context is an element of a non-core resource, value is a url, #, and a path
            if (context.value.indexOf('#') > -1) {
              const [url, path] = context.value.split('#');
              const newUrl = optimizeURL(
                url,
                pkg.aliases,
                FISHER_TYPES,
                fisher,
                options.alias ?? true
              );
              if (newUrl !== url) {
                let separator: string;
                if (newUrl.startsWith('$')) {
                  separator = '#';
                } else {
                  separator = '.';
                }
                context.value = `${newUrl}${separator}${path}`;
              }
            } else if (isUri(context.value)) {
              context.value = optimizeURL(
                context.value,
                pkg.aliases,
                FISHER_TYPES,
                fisher,
                options.alias ?? true
              );
            }
          }
        });
      }
    }
  }
} as OptimizerPlugin;
