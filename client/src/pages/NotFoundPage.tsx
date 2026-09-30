import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
export default function NotFoundPage() {
  return <PublicLayout title="Page not found"><div className="card py-20 px-6 text-center"><FileQuestion className="w-16 h-16 mx-auto text-blue-500 mb-5" /><p className="text-muted mb-6">This page may have moved, or the address may be incomplete.</p><Link to="/dashboard" className="btn-primary">Go to dashboard</Link></div></PublicLayout>;
}
