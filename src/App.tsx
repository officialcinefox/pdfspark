import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { ScrollToTop } from './components/ScrollToTop'

const Home = React.lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const AllTools = React.lazy(() => import('./pages/AllTools').then((module) => ({ default: module.AllTools })))
const CategoryTools = React.lazy(() => import('./pages/CategoryTools').then((module) => ({ default: module.CategoryTools })))
const Features = React.lazy(() => import('./pages/Features').then((module) => ({ default: module.Features })))
const Security = React.lazy(() => import('./pages/Security').then((module) => ({ default: module.Security })))
const Guides = React.lazy(() => import('./pages/Guides').then((module) => ({ default: module.Guides })))
const Contact = React.lazy(() => import('./pages/Contact').then((module) => ({ default: module.Contact })))
const About = React.lazy(() => import('./pages/About').then((module) => ({ default: module.About })))
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy').then((module) => ({ default: module.PrivacyPolicy })))
const TermsConditions = React.lazy(() => import('./pages/TermsConditions').then((module) => ({ default: module.TermsConditions })))
const Disclaimer = React.lazy(() => import('./pages/Disclaimer').then((module) => ({ default: module.Disclaimer })))
const Blog = React.lazy(() => import('./pages/Blog').then((module) => ({ default: module.Blog })))
const BlogPost = React.lazy(() => import('./pages/BlogPost').then((module) => ({ default: module.BlogPost })))
const MergeTool = React.lazy(() => import('./pages/tools/Merge').then((module) => ({ default: module.MergeTool })))
const SplitTool = React.lazy(() => import('./pages/tools/Split').then((module) => ({ default: module.SplitTool })))
const CompressTool = React.lazy(() => import('./pages/tools/Compress').then((module) => ({ default: module.CompressTool })))
const RotateTool = React.lazy(() => import('./pages/tools/Rotate').then((module) => ({ default: module.RotateTool })))
const LockTool = React.lazy(() => import('./pages/tools/Lock').then((module) => ({ default: module.LockTool })))
const UnlockTool = React.lazy(() => import('./pages/tools/Unlock').then((module) => ({ default: module.UnlockTool })))
const ImageToPdfTool = React.lazy(() => import('./pages/tools/ImageToPdf').then((module) => ({ default: module.ImageToPdfTool })))
const GenericPdfTool = React.lazy(() => import('./pages/tools/GenericPdfTool').then((module) => ({ default: module.GenericPdfTool })))
const Login = React.lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })))
const Dashboard = React.lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const ResetPassword = React.lazy(() => import('./pages/ResetPassword').then((module) => ({ default: module.ResetPassword })))

function page(element: React.ReactElement) {
  return (
    <React.Suspense fallback={<div className="min-h-[45vh] flex items-center justify-center text-sm font-bold opacity-50">Loading PDF Spark...</div>}>
      {element}
    </React.Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={page(<Home />)} />
          <Route path="tools" element={page(<AllTools />)} />
          <Route path="blog" element={page(<Blog />)} />
          <Route path="blog/:slug" element={page(<BlogPost />)} />
          <Route path="tools/:categorySlug" element={page(<CategoryTools />)} />
          <Route path="features" element={page(<Features />)} />
          <Route path="security" element={page(<Security />)} />
          <Route path="guides" element={page(<Guides />)} />
          <Route path="about" element={page(<About />)} />
          <Route path="contact" element={page(<Contact />)} />
          <Route path="privacy-policy" element={page(<PrivacyPolicy />)} />
          <Route path="terms-and-conditions" element={page(<TermsConditions />)} />
          <Route path="disclaimer" element={page(<Disclaimer />)} />
          <Route path="tool/merge" element={page(<MergeTool />)} />
          <Route path="tool/split" element={page(<SplitTool />)} />
          <Route path="tool/compress" element={page(<CompressTool />)} />
          <Route path="tool/rotate" element={page(<RotateTool />)} />
          <Route path="tool/lock" element={page(<LockTool />)} />
          <Route path="tool/unlock" element={page(<UnlockTool />)} />
          <Route path="tool/image-to-pdf" element={page(<ImageToPdfTool />)} />
          <Route path="tool/:toolId" element={page(<GenericPdfTool />)} />
        </Route>
        <Route path="login" element={page(<Login />)} />
        <Route path="dashboard" element={page(<Dashboard />)} />
        <Route path="reset-password" element={page(<ResetPassword />)} />
      </Routes>
    </BrowserRouter>
  )
}
