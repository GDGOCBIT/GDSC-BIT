export default function Footer () {
  return (
    <div className='footer-section'>
      <div className='section'>
        <div className='section-title-container'>
          <h1 id='main-join-btn' className='section-heading'>
            Stay Updated
          </h1>
        </div>

        <div className='join-now-btn-container'>
          <button
            onClick={() => {
              window.open(
                'https://gdg.community.dev/gdg-on-campus-bengal-institute-of-technology-kolkata-india/'
              )
            }}
            id='join-now-btn'
          >
            JOIN NOW
          </button>
        </div>
      </div>
      <div className='px-4 sm:py-[5px] sm:px-[50px] flex flex-col sm:flex-row items-center gap-2'>
        <img
          src='/gdsc_original.png'
          className='w-[66.67px] h-[32.27px] '
          alt='our gdsc logo'
        />
        <div className='chapter'>
          <p className='community-name'>Google Developer Student Clubs</p>
          <p className='chapter-name'>Bengal Institute of Technology</p>
        </div>
      </div>
      <div className='footer-color-strip'>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>
  )
}
