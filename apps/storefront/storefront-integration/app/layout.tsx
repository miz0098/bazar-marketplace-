import Layout from '../../app/layout';
export const dynamic='force-dynamic';
export {metadata} from '../../app/layout';
export default function IntegrationLayout({children}:{children:React.ReactNode}){return <Layout integration>{children}</Layout>;}
