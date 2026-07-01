export default function StructuredData() {
  const org = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SureWord Radio',
    alternateName: 'The Whole Word to the Whole World',
    url: 'https://surewordradio.org',
    logo: 'https://surewordradio.org/logo.png',
    description: 'The official digital radio ministry of Sure Word Media.',
    sameAs: [
      'https://facebook.com/surewordradio',
      'https://instagram.com/surewordradio',
      'https://youtube.com/surewordradio',
      'https://twitter.com/surewordradio',
    ],
  }
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SureWord Radio',
    url: 'https://surewordradio.org',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://surewordradio.org/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
    </>
  )
}

