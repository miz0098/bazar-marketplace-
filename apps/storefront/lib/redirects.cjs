/** Canonical legacy routes shared by both storefront entrypoints. */
exports.storefrontRedirects=function storefrontRedirects(){return [
    ['/pages/delivery-payment','/help/delivery'],['/pages/returns','/help/returns'],['/pages/warranty','/help/warranty'],['/pages/order-tracking','/help/order-tracking'],['/pages/about','/about'],['/pages/partners','/help/partners'],['/blogs/news','/help/news'],['/pages/public-offer','/help/public-offer'],['/policies/privacy-policy','/help/privacy-policy'],['/policies/terms-of-service','/help/terms-of-service']
  ].map(([source,destination])=>({source,destination,permanent:true}));}
